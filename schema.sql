DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    plan_expires_at INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    html TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_email) REFERENCES users(email) ON DELETE CASCADE
);
