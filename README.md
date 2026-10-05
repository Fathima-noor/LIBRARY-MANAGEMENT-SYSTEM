# Library Management System

A portfolio project built with React, Flask and SQLite.

## Features

- Login/logout
- Dashboard statistics
- Add, edit and delete books
- Book cover image URL
- Due dates
- Search books
- Borrow/return status
- Add/delete members
- SQLite database
- Password hashing
- Responsive UI

## Demo login

Username: `admin`
Password: `admin123`

Change the demo credentials before using the project as a real deployed application.

## Frontend

```bash
npm install
npm run dev
```

## Backend

Open another terminal:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend: http://127.0.0.1:5000

Frontend: http://localhost:5173

The SQLite database is created automatically as `backend/library.db`.
