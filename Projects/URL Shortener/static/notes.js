let notes = [];
let currentNote = null;

document.getElementById('avatarEl').textContent = USERNAME.slice(0, 2).toUpperCase();

async function loadNotes() {
  const res = await fetch('/api/notes');
  notes = await res.json();
  renderList();
}

function renderList() {
  const list = document.getElementById('notesList');
  list.innerHTML = '';
  notes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'note-item' + (currentNote && currentNote.id === n.id ? ' active' : '');
    div.innerHTML = `
      <div class="note-item-title">${n.title || 'Без названия'}</div>
      <div class="note-item-preview">${(n.content || '').slice(0, 50)}</div>
    `;
    div.onclick = () => openNote(n);
    list.appendChild(div);
  });
}

function openNote(note) {
  currentNote = note;
  document.getElementById('emptyState').style.display = 'none';
  const ed = document.getElementById('editor');
  ed.style.display = 'flex';
  document.getElementById('titleInput').value = note.title || '';
  document.getElementById('contentArea').value = note.content || '';
  document.getElementById('shortResult').classList.remove('show');
  document.getElementById('urlInput').value = '';
  renderList();
}

async function createNote() {
  const res = await fetch('/api/notes', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({title: 'Новая заметка', content: ''})
  });
  const note = await res.json();
  notes.unshift(note);
  openNote(note);
}

async function saveNote() {
  if (!currentNote) return;
  const btn = document.getElementById('saveBtn');
  btn.textContent = 'Сохранение...';
  btn.disabled = true;

  await fetch(`/api/notes/${currentNote.id}`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      title: document.getElementById('titleInput').value,
      content: document.getElementById('contentArea').value
    })
  });

  currentNote.title = document.getElementById('titleInput').value;
  currentNote.content = document.getElementById('contentArea').value;
  renderList();

  btn.textContent = 'Сохранено ✓';
  setTimeout(() => {
    btn.textContent = 'Сохранить';
    btn.disabled = false;
  }, 1500);
}

async function deleteNote() {
  if (!currentNote) return;
  await fetch(`/api/notes/${currentNote.id}`, {method: 'DELETE'});
  notes = notes.filter(n => n.id !== currentNote.id);
  currentNote = null;
  document.getElementById('editor').style.display = 'none';
  document.getElementById('emptyState').style.display = 'flex';
  renderList();
}

async function doShorten() {
  const url = document.getElementById('urlInput').value;
  if (!url) return;

  const btn = document.querySelector('.shorten-btn');
  btn.textContent = 'Сокращаем...';
  btn.disabled = true;

  const res = await fetch('/api/shorten', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url})
  });

  const data = await res.json();
  btn.textContent = 'Сократить →';
  btn.disabled = false;

  if (data.short_url) {
    document.getElementById('shortUrl').textContent = data.short_url;
    document.getElementById('shortResult').classList.add('show');
  }
}

function doCopy() {
  const url = document.getElementById('shortUrl').textContent;
  navigator.clipboard.writeText(url);
  const btn = document.querySelector('.copy-btn');
  btn.textContent = 'Скопировано!';
  setTimeout(() => btn.textContent = 'Копировать', 1500);
}

function insertToNote() {
  const url = document.getElementById('shortUrl').textContent;
  const ta = document.getElementById('contentArea');
  ta.value += (ta.value ? '\n' : '') + url;
  document.getElementById('shortResult').classList.remove('show');
  document.getElementById('urlInput').value = '';
}

async function doLogout() {
  await fetch('/api/logout', {method: 'POST'});
  window.location.href = '/';
}

loadNotes();