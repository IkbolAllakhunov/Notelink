CREATE TABLE IF NOT EXISTS urls (
    id          SERIAL PRIMARY KEY,
    short_code  VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    click_count INT DEFAULT 0,
    expires_at  TIMESTAMP NULL
);