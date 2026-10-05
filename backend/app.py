import os
import sqlite3
from functools import wraps
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "library.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("LIBRARY_SECRET_KEY", "dev-only-change-this")
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://127.0.0.1:5173"])


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            category TEXT NOT NULL,
            cover_url TEXT,
            status TEXT NOT NULL DEFAULT 'Available',
            due_date TEXT
        );

        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL
        );
    """)

    user = conn.execute("SELECT id FROM users WHERE username = ?", ("admin",)).fetchone()
    if not user:
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            ("admin", generate_password_hash("admin123"))
        )

    count = conn.execute("SELECT COUNT(*) AS count FROM books").fetchone()["count"]
    if count == 0:
        conn.executemany(
            """INSERT INTO books
            (title, author, category, cover_url, status, due_date)
            VALUES (?, ?, ?, ?, ?, ?)""",
            [
                ("Atomic Habits", "James Clear", "Self Help",
                 "https://covers.openlibrary.org/b/isbn/9780735211292-M.jpg",
                 "Available", ""),
                ("The Alchemist", "Paulo Coelho", "Fiction",
                 "https://covers.openlibrary.org/b/isbn/9780062315007-M.jpg",
                 "Borrowed", "2026-10-15"),
                ("Python Crash Course", "Eric Matthes", "Programming",
                 "https://covers.openlibrary.org/b/isbn/9781718502703-M.jpg",
                 "Available", "")
            ]
        )

    member_count = conn.execute("SELECT COUNT(*) AS count FROM members").fetchone()["count"]
    if member_count == 0:
        conn.executemany(
            "INSERT INTO members (name, email, phone) VALUES (?, ?, ?)",
            [
                ("John Smith", "john@gmail.com", "9876543210"),
                ("Anu Thomas", "anu@gmail.com", "9876543211")
            ]
        )

    conn.commit()
    conn.close()


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Login required"}), 401
        return fn(*args, **kwargs)
    return wrapper


def row_to_dict(row):
    return dict(row)


@app.post("/api/login")
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    conn = db()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid username or password"}), 401

    session.clear()
    session["user_id"] = user["id"]
    session["username"] = user["username"]

    return jsonify({"user": {"id": user["id"], "username": user["username"]}})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"message": "Logged out"})


@app.get("/api/me")
def me():
    if "user_id" not in session:
        return jsonify({"logged_in": False})

    return jsonify({
        "logged_in": True,
        "user": {
            "id": session["user_id"],
            "username": session["username"]
        }
    })


@app.get("/api/books")
@login_required
def get_books():
    conn = db()
    rows = conn.execute("SELECT * FROM books ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@app.post("/api/books")
@login_required
def create_book():
    data = request.get_json() or {}
    required = ["title", "author", "category"]

    if any(not str(data.get(field, "")).strip() for field in required):
        return jsonify({"error": "Title, author and category are required"}), 400

    conn = db()
    cur = conn.execute(
        """INSERT INTO books
        (title, author, category, cover_url, status, due_date)
        VALUES (?, ?, ?, ?, 'Available', ?)""",
        (
            data["title"].strip(),
            data["author"].strip(),
            data["category"].strip(),
            data.get("cover_url", "").strip(),
            data.get("due_date", "")
        )
    )
    conn.commit()
    row = conn.execute("SELECT * FROM books WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@app.put("/api/books/<int:book_id>")
@login_required
def update_book(book_id):
    data = request.get_json() or {}

    conn = db()
    existing = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()

    if not existing:
        conn.close()
        return jsonify({"error": "Book not found"}), 404

    conn.execute(
        """UPDATE books
        SET title=?, author=?, category=?, cover_url=?, due_date=?
        WHERE id=?""",
        (
            data.get("title", existing["title"]).strip(),
            data.get("author", existing["author"]).strip(),
            data.get("category", existing["category"]).strip(),
            data.get("cover_url", existing["cover_url"] or "").strip(),
            data.get("due_date", existing["due_date"] or ""),
            book_id
        )
    )
    conn.commit()
    row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))


@app.delete("/api/books/<int:book_id>")
@login_required
def delete_book(book_id):
    conn = db()
    conn.execute("DELETE FROM books WHERE id = ?", (book_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Book deleted"})


@app.post("/api/books/<int:book_id>/toggle")
@login_required
def toggle_book(book_id):
    conn = db()
    book = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()

    if not book:
        conn.close()
        return jsonify({"error": "Book not found"}), 404

    new_status = "Borrowed" if book["status"] == "Available" else "Available"
    conn.execute(
        "UPDATE books SET status=? WHERE id=?",
        (new_status, book_id)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row))


@app.get("/api/members")
@login_required
def get_members():
    conn = db()
    rows = conn.execute("SELECT * FROM members ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([row_to_dict(row) for row in rows])


@app.post("/api/members")
@login_required
def create_member():
    data = request.get_json() or {}

    if not all(str(data.get(field, "")).strip() for field in ["name", "email", "phone"]):
        return jsonify({"error": "All member fields are required"}), 400

    conn = db()
    cur = conn.execute(
        "INSERT INTO members (name, email, phone) VALUES (?, ?, ?)",
        (data["name"].strip(), data["email"].strip(), data["phone"].strip())
    )
    conn.commit()
    row = conn.execute("SELECT * FROM members WHERE id=?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(row_to_dict(row)), 201


@app.delete("/api/members/<int:member_id>")
@login_required
def delete_member(member_id):
    conn = db()
    conn.execute("DELETE FROM members WHERE id=?", (member_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Member deleted"})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
