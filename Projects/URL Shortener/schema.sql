CREATE TABLE IF NOT EXISTS urls (
    id          SERIAL PRIMARY KEY,
    short_code  VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    click_count INT DEFAULT 0,
    expires_at  TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE NOT NULL,
    email      VARCHAR(100) UNIQUE NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title        VARCHAR(200) NOT NULL,
    content      TEXT,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);