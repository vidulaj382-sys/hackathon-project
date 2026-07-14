import sqlite3
import os

DB_PATH = 'gwen_profiles.db'

def get_connection():
    try:
        from pysqlcipher3 import dbapi2 as sqlite
        conn = sqlite.connect(DB_PATH)
        conn.execute('pragma key="project_gwen_secure_key_2026"')
    except ImportError:
        import sqlite3
        conn = sqlite3.connect(DB_PATH)
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            level TEXT,
            mmr INTEGER
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            expression TEXT,
            is_correct BOOLEAN,
            latency_ms INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')
    # Default user Siddhesh
    c.execute('INSERT OR IGNORE INTO users (name, level, mmr) VALUES (?, ?, ?)', ('Siddhesh', 'Iron', 1000))
    conn.commit()
    conn.close()

def get_user(name="Siddhesh"):
    conn = get_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE name = ?', (name,))
    user = c.fetchone()
    conn.close()
    if user:
        return {"id": user[0], "name": user[1], "level": user[2], "mmr": user[3]}
    return None

def update_mmr(name, new_mmr):
    conn = get_connection()
    c = conn.cursor()
    c.execute('UPDATE users SET mmr = ? WHERE name = ?', (new_mmr, name))
    conn.commit()
    conn.close()

def log_history(user_id, expression, is_correct, latency_ms):
    conn = get_connection()
    c = conn.cursor()
    c.execute('INSERT INTO history (user_id, expression, is_correct, latency_ms) VALUES (?, ?, ?, ?)', (user_id, expression, is_correct, latency_ms))
    conn.commit()
    conn.close()
