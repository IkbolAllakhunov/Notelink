async function shortenUrl() {
    const url = document.getElementById('urlInput').value;

    const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
    });

    const data = await response.json();

    if (data.short_url) {
        const link = document.getElementById('shortLink');
        link.href = data.short_url;
        link.textContent = data.short_url;
        document.getElementById('result').classList.remove('hidden');
    } else {
        alert('Ошибка: ' + data.error);
    }
}