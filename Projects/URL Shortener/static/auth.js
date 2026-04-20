async function doLogin() {
  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Входим...';
  btn.disabled = true;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    })
  });

  const data = await res.json();
  if (data.success) {
    window.location.href = '/notes';
  } else {
    const err = document.getElementById('error');
    err.textContent = data.error;
    err.style.display = 'block';
    btn.textContent = 'Войти';
    btn.disabled = false;
  }
}

async function doRegister() {
  const btn = document.getElementById('submitBtn');
  btn.textContent = 'Создаём...';
  btn.disabled = true;

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      username: document.getElementById('username') ? document.getElementById('username').value : '',
      email: document.getElementById('email').value,
      password: document.getElementById('password').value
    })
  });

  const data = await res.json();
  if (data.success) {
    window.location.href = '/notes';
  } else {
    const err = document.getElementById('error');
    err.textContent = data.error;
    err.style.display = 'block';
    btn.textContent = 'Создать аккаунт';
    btn.disabled = false;
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    document.getElementById('submitBtn').click();
  }
});