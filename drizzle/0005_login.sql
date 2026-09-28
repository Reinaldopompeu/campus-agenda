CREATE TABLE auth_account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL, failures INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE auth_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
