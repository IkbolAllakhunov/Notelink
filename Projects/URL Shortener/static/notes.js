let notes = [];
let currentNote = null;
let selectMode = false;
let selectedIds = new Set();
let pendingAction = null;

document.getElementById('avatarEl').textContent = USERNAME.slice(0, 2).toUpperCase();

async function loadNotes() {
  const res = await fetch('/api/notes');
  notes = await res.json();
  renderList();
}

function renderList() {
  const list = document.getElementById('notesList');
  list.innerHTML = '';

  if (selectMode) {
    list.classList.add('select-mode');
  } else {
    list.classList.remove('select-mode');
  }

  notes.forEach(n => {
    const div = document.createElement('div');
    const isSelected = selectedIds.has(n.id);
    div.className = 'note-item' +
      (currentNote && currentNote.id === n.id && !selectMode ? ' active' : '') +
      (isSelected ? ' selected' : '');

    div.innerHTML = `
      <div class="checkbox">${isSelected ? '✓' : ''}</div>
      <div class="note-item-content">
        <div class="note-item-title">${n.title || 'Без названия'}</div>
        <div class="note-item-preview">${(n.content || '').slice(0, 50)}</div>
      </div>
    `;

    div.onclick = () => {
      if (selectMode) {
        toggleSelect(n.id);
      } else {
        openNote(n);
      }
    };

    list.appendChild(div);
  });
}

function toggleSelect(id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
  } else {
    selectedIds.add(id);
  }
  renderList();
}

function toggleSelectMode() {
  selectMode = !selectMode;
  selectedIds.clear();

  const btn = document.getElementById('selectModeBtn');
  const actions = document.getElementById('selectActions');

  if (selectMode) {
    btn.style.display = 'none';
    actions.classList.add('show');
  } else {
    btn.style.display = 'flex';
    actions.classList.remove('show');
  }

  renderList();
}

async function deleteSelected() {
  if (selectedIds.size === 0) return;

  showConfirm(
    `Удалить ${selectedIds.size} заметок?`,
    'Это действие нельзя отменить.',
    async () => {
      for (const id of selectedIds) {
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      }
      if (currentNote && selectedIds.has(currentNote.id)) {
        currentNote = null;
        document.getElementById('editor').style.display = 'none';
        document.getElementById('emptyState').style.display = 'flex';
      }
      notes = notes.filter(n => !selectedIds.has(n.id));
      selectedIds.clear();
      toggleSelectMode();
    }
  );
}

async function confirmDeleteAll() {
  showConfirm(
    'Удалить все заметки?',
    `Будет удалено ${notes.length} заметок. Это нельзя отменить.`,
    async () => {
      for (const n of notes) {
        await fetch(`/api/notes/${n.id}`, { method: 'DELETE' });
      }
      notes = [];
      selectedIds.clear();
      currentNote = null;
      document.getElementById('editor').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      toggleSelectMode();
    }
  );
}

function showConfirm(title, text, action) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmDialog').style.display = 'flex';
  pendingAction = action;
}

async function confirmAction() {
  closeConfirm();
  if (pendingAction) {
    await pendingAction();
    pendingAction = null;
  }
}

function closeConfirm() {
  document.getElementById('confirmDialog').style.display = 'none';
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Новая заметка', content: '' })
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
    headers: { 'Content-Type': 'application/json' },
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
  showConfirm(
    'Удалить заметку?',
    'Это действие нельзя отменить.',
    async () => {
      await fetch(`/api/notes/${currentNote.id}`, { method: 'DELETE' });
      notes = notes.filter(n => n.id !== currentNote.id);
      currentNote = null;
      document.getElementById('editor').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      renderList();
    }
  );
}

async function doShorten() {
  const url = document.getElementById('urlInput').value;
  if (!url) return;

  const btn = document.querySelector('.shorten-btn');
  btn.textContent = 'Сокращаем...';
  btn.disabled = true;

  const res = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
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
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

loadNotes();