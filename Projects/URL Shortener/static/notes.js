let notes = [];
let currentNote = null;
let selectMode = false;
let selectedIds = new Set();
let pendingAction = null;

document.getElementById('avatarEl').textContent = USERNAME.slice(0, 2).toUpperCase();

// ───────────────────────────────────────────
// Rich Text Editor
// ───────────────────────────────────────────

function execCmd(cmd, value = null) {
  document.getElementById('contentArea').focus();
  document.execCommand(cmd, false, value);
  updateToolbarState();
}

function applyFontSize(size) {
  if (!size) return;
  document.getElementById('contentArea').focus();
  document.execCommand('fontSize', false, size);
  // reset select back to placeholder
  setTimeout(() => { document.getElementById('fontSizeSelect').value = ''; }, 100);
  updateToolbarState();
}

function applyTextColor(color) {
  document.getElementById('contentArea').focus();
  document.execCommand('foreColor', false, color);
}

function applyHighlight(color) {
  document.getElementById('contentArea').focus();
  document.execCommand('hiliteColor', false, color);
}

// Highlight active toolbar buttons based on current selection
function updateToolbarState() {
  const cmds = ['bold', 'italic', 'underline', 'strikeThrough',
                 'insertUnorderedList', 'insertOrderedList',
                 'justifyLeft', 'justifyCenter', 'justifyRight'];
  cmds.forEach(cmd => {
    const btn = document.querySelector(`.toolbar-btn[data-cmd="${cmd}"]`);
    if (btn) {
      btn.classList.toggle('active', document.queryCommandState(cmd));
    }
  });
}

// Listen for selection changes to update toolbar
document.addEventListener('selectionchange', () => {
  const area = document.getElementById('contentArea');
  if (area && document.activeElement === area) {
    updateToolbarState();
  }
});

// Placeholder behaviour for contenteditable
function updatePlaceholder() {
  const area = document.getElementById('contentArea');
  if (!area) return;
  if (area.innerHTML === '' || area.innerHTML === '<br>') {
    area.classList.add('empty');
  } else {
    area.classList.remove('empty');
  }
}

// ───────────────────────────────────────────
// Notes CRUD
// ───────────────────────────────────────────

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

    // Strip HTML tags for preview
    const plainPreview = (n.content || '').replace(/<[^>]+>/g, '').slice(0, 50);

    div.innerHTML = `
      <div class="checkbox">${isSelected ? '✓' : ''}</div>
      <div class="note-item-content">
        <div class="note-item-title">${n.title || 'Без названия'}</div>
        <div class="note-item-preview">${plainPreview}</div>
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
      for (const n of [...notes]) {
        await fetch(`/api/notes/${n.id}`, { method: 'DELETE' });
      }
      notes = [];
      selectedIds.clear();
      currentNote = null;
      document.getElementById('editor').style.display = 'none';
      document.getElementById('emptyState').style.display = 'flex';
      selectMode = false;
      document.getElementById('selectModeBtn').style.display = 'flex';
      document.getElementById('selectActions').classList.remove('show');
      renderList();
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

  // Load HTML content into contenteditable
  const area = document.getElementById('contentArea');
  area.innerHTML = note.content || '';
  updatePlaceholder();
  updateToolbarState();

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

  const area = document.getElementById('contentArea');
  // Save innerHTML to preserve formatting
  const content = area.innerHTML === '<br>' ? '' : area.innerHTML;

  await fetch(`/api/notes/${currentNote.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: document.getElementById('titleInput').value,
      content: content
    })
  });

  currentNote.title = document.getElementById('titleInput').value;
  currentNote.content = content;
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

// ───────────────────────────────────────────
// URL Shortener
// ───────────────────────────────────────────

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
  const area = document.getElementById('contentArea');
  area.focus();
  // Insert link at cursor / end
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    const link = document.createElement('a');
    link.href = url;
    link.textContent = url;
    link.style.color = '#7F77DD';
    range.insertNode(link);
    range.setStartAfter(link);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    area.innerHTML += `<a href="${url}" style="color:#7F77DD">${url}</a>`;
  }
  document.getElementById('shortResult').classList.remove('show');
  document.getElementById('urlInput').value = '';
  updatePlaceholder();
}

// ───────────────────────────────────────────
// Misc
// ───────────────────────────────────────────

async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

// Attach input listener for placeholder
document.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('contentArea');
  if (area) {
    area.addEventListener('input', updatePlaceholder);
  }
});

loadNotes();
