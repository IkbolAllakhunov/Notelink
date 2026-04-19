from flask import Flask, request, jsonify, redirect, render_template, abort
from database import get_connection
import random
import string
import os

app = Flask(__name__)

def generate_code(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

@app.route('/')
def index():
    return render_template('index.html')

# Создание короткой ссылки
@app.route('/api/shorten', methods=['POST'])
def shorten():
    data = request.get_json()
    original_url = data.get('url')

    if not original_url or not original_url.startswith('http'):
        return jsonify({'error': 'Неверный URL'}), 400

    code = generate_code()
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT INTO urls (short_code, original_url) VALUES (%s, %s) RETURNING short_code",
        (code, original_url)
    )
    conn.commit()
    cur.close()
    conn.close()

    return jsonify({'short_url': request.host_url + code})

# Редирект по короткой ссылке
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

# Статистика ссылки
@app.route('/api/stats/<code>')
def stats(code):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT original_url, click_count, created_at FROM urls WHERE short_code = %s", (code,))
    row = cur.fetchone()
    cur.close()
    conn.close()

    if row is None:
        return jsonify({'error': 'Не найдено'}), 404

    return jsonify({
        'original_url': row[0],
        'clicks': row[1],
        'created_at': str(row[2])
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)