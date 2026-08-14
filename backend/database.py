"""
Database module — PostgreSQL connection, schema initialization, and seed data.
"""
import os
import json
import uuid
import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/typeform")


def get_connection():
    """Create and return a database connection with dict row factory."""
    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Forms table
        CREATE TABLE IF NOT EXISTS forms (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL DEFAULT 'Untitled Form',
            description TEXT,
            is_published INTEGER DEFAULT 0,
            share_slug TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Questions table
        CREATE TABLE IF NOT EXISTS questions (
            id SERIAL PRIMARY KEY,
            form_id INTEGER NOT NULL,
            question_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            is_required INTEGER DEFAULT 0,
            position INTEGER NOT NULL DEFAULT 0,
            options TEXT,  -- JSON string for choices
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
        );

        -- Responses table
        CREATE TABLE IF NOT EXISTS responses (
            id SERIAL PRIMARY KEY,
            form_id INTEGER NOT NULL,
            respondent_id TEXT,  -- anonymous UUID
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
        );

        -- Answers table
        CREATE TABLE IF NOT EXISTS answers (
            id SERIAL PRIMARY KEY,
            response_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            value TEXT,
            FOREIGN KEY (response_id) REFERENCES responses(id) ON DELETE CASCADE,
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        );
    """)

    conn.commit()
    conn.close()
