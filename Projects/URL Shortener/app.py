from flask import Flask, request, jsonify, redirect, render_template, abort
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from database import get_connection
import random
import string
import os

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-123")

bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login_page'

class User(UserMixin):
    def __init__(self, id, username, email):
        self.id = id
        self.username = username
        self.email = email

@login_manager.user_loader
def load_user(user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, email FROM users WHERE id = %s", (user_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return User(row[0], row[1], row[2])
    return None

def generate_code(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

# Страницы
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect('/notes')
    return render_template('index.html')

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/register')
def register_page():
    return render_template('register.html')

@app.route('/notes')
@login_required
def notes_page():
    return render_template('notes.html', username=current_user.username)

# API Auth
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Заполните все поля'}), 400

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')

    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s) RETURNING id",
            (username, email, hashed)
        )
        user_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        user = User(user_id, username, email)
        login_user(user)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Пользователь уже существует'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, username, email, password FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row and bcrypt.check_password_hash(row[3], password):
        user = User(row[0], row[1], row[2])
        login_user(user)
        return jsonify({'success': True})
    return jsonify({'error': 'Неверный email или пароль'}), 401

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})

# API Notes
@app.route('/api/notes', methods=['GET'])
@login_required
def get_notes():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, content, created_at FROM notes WHERE user_id = %s ORDER BY updated_at DESC",
        (current_user.id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify([{'id': r[0], 'title': r[1], 'content': r[2], 'created_at': str(r[3])} for r in rows])

@app.route('/api/notes', methods=['POST'])
@login_required
def create_note():
    data = request.get_json()
    title = data.get('title', 'Без названия')
    content = data.get('content', '')
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO notes (user_id, title, content) VALUES (%s, %s, %s) RETURNING id, created_at",
        (current_user.id, title, content)
    )
    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'id': row[0], 'title': title, 'content': content, 'created_at': str(row[1])})

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    data = request.get_json()
    title = data.get('title', 'Без названия')
    content = data.get('content', '')
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "UPDATE notes SET title=%s, content=%s, updated_at=NOW() WHERE id=%s AND user_id=%s",
        (title, content, note_id, current_user.id)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM notes WHERE id=%s AND user_id=%s", (note_id, current_user.id))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'success': True})

# API URL Shortener
@app.route('/api/shorten', methods=['POST'])
@login_required
def shorten():
    data = request.get_json()
    original_url = data.get('url')
    if not original_url or not original_url.startswith('http'):
        return jsonify({'error': 'Неверный URL'}), 400
    code = generate_code()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO urls (short_code, original_url) VALUES (%s, %s)",
        (code, original_url)
    )
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({'short_url': request.host_url + code})

@app.route('/<code>')
def redirect_url(code):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT original_url FROM urls WHERE short_code = %s", (code,))
    row = cur.fetchone()
    if row is None:
        abort(404)
    cur.execute("UPDATE urls SET click_count = click_count + 1 WHERE short_code = %s", (code,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(row[0], code=302)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
# API Chat (AI)
@app.route('/api/chat', methods=['POST'])
@login_required
def chat():
    data = request.get_json()
    messages = data.get('messages', [])
    if not messages:
        return jsonify({'error': 'Нет сообщений'}), 400

    api_key = os.environ.get('GROQ_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'API ключ не настроен.'}), 500

    try:
        resp = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'llama-3.3-70b-versatile',
                'max_tokens': 1024,
                'temperature': 0.7,
                'messages': [
                    {
                        'role': 'system',
                        'content': 'Ты умный ассистент встроенный в приложение Notelink — это сервис заметок с сокращением ссылок. Отвечай кратко и по делу. Если пользователь просит помочь с заметками или ссылками — помогай. Отвечай на том языке, на котором пишет пользователь.'
                    }
                ] + messages
            },
            timeout=30
        )
        result = resp.json()
        if 'choices' in result:
            reply = result['choices'][0]['message']['content']
            return jsonify({'reply': reply})
        else:
            error_msg = result.get('error', {}).get('message', 'Ошибка Groq API')
            return jsonify({'error': error_msg}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
