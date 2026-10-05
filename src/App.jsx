import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [books, setBooks] = useState([])
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [showBookForm, setShowBookForm] = useState(false)
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [loading, setLoading] = useState(true)

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')

  const emptyBook = { title: '', author: '', category: '', cover_url: '', due_date: '' }
  const emptyMember = { name: '', email: '', phone: '' }

  const [bookForm, setBookForm] = useState(emptyBook)
  const [memberForm, setMemberForm] = useState(emptyMember)

  useEffect(() => {
    fetch(`${API}/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.logged_in) {
          setUser(data.user)
          loadData()
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  const loadData = async () => {
    try {
      const [booksRes, membersRes] = await Promise.all([
        fetch(`${API}/books`, { credentials: 'include' }),
        fetch(`${API}/members`, { credentials: 'include' })
      ])
      setBooks(await booksRes.json())
      setMembers(await membersRes.json())
    } finally {
      setLoading(false)
    }
  }

  const login = async (e) => {
    e.preventDefault()
    setLoginError('')

    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(loginForm)
    })

    const data = await res.json()

    if (!res.ok) {
      setLoginError(data.error || 'Login failed')
      return
    }

    setUser(data.user)
    loadData()
  }

  const logout = async () => {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
    setPage('dashboard')
  }

  const saveBook = async (e) => {
    e.preventDefault()

    const method = editingBook ? 'PUT' : 'POST'
    const url = editingBook
      ? `${API}/books/${editingBook.id}`
      : `${API}/books`

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(bookForm)
    })

    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Could not save book')
      return
    }

    await loadData()
    setShowBookForm(false)
    setEditingBook(null)
    setBookForm(emptyBook)
  }

  const deleteBook = async (id) => {
    if (!confirm('Delete this book?')) return

    await fetch(`${API}/books/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    loadData()
  }

  const toggleBook = async (id) => {
    await fetch(`${API}/books/${id}/toggle`, {
      method: 'POST',
      credentials: 'include'
    })
    loadData()
  }

  const saveMember = async (e) => {
    e.preventDefault()

    const res = await fetch(`${API}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(memberForm)
    })

    if (!res.ok) {
      const data = await res.json()
      alert(data.error || 'Could not add member')
      return
    }

    await loadData()
    setShowMemberForm(false)
    setMemberForm(emptyMember)
  }

  const deleteMember = async (id) => {
    if (!confirm('Delete this member?')) return

    await fetch(`${API}/members/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    loadData()
  }

  const openAddBook = () => {
    setEditingBook(null)
    setBookForm(emptyBook)
    setShowBookForm(true)
  }

  const openEditBook = (book) => {
    setEditingBook(book)
    setBookForm({
      title: book.title,
      author: book.author,
      category: book.category,
      cover_url: book.cover_url || '',
      due_date: book.due_date || ''
    })
    setShowBookForm(true)
  }

  const filteredBooks = books.filter(book =>
    `${book.title} ${book.author} ${book.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const available = books.filter(b => b.status === 'Available').length
  const borrowed = books.filter(b => b.status === 'Borrowed').length

  if (loading) return <div className="loading">Loading Library...</div>

  if (!user) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="login-logo">📚</div>
          <h1>Library Management</h1>
          <p>Sign in to continue</p>

          <label>Username</label>
          <input
            value={loginForm.username}
            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
            placeholder="Enter username"
          />

          <label>Password</label>
          <input
            type="password"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
            placeholder="Enter password"
          />

          {loginError && <div className="error">{loginError}</div>}

          <button className="primary-button full" type="submit">Login</button>

          <small>Demo: admin / admin123</small>
        </form>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span>📚</span>
          <h1>Library Management System</h1>
        </div>
        <div className="user-area">
          <span>Welcome, {user.username}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <h2>Library</h2>
          {[
            ['dashboard', '🏠 Dashboard'],
            ['books', '📚 Books'],
            ['members', '👥 Members'],
            ['borrow', '🔄 Borrow / Return']
          ].map(([key, label]) => (
            <button
              key={key}
              className={page === key ? 'menu active' : 'menu'}
              onClick={() => setPage(key)}
            >
              {label}
            </button>
          ))}
        </aside>

        <main className="main">
          {page === 'dashboard' && (
            <>
              <div className="page-title">
                <h2>Dashboard</h2>
                <p>Overview of your library</p>
              </div>

              <div className="cards">
                <div className="card"><div className="card-icon">📚</div><div><p>Total Books</p><h3>{books.length}</h3></div></div>
                <div className="card"><div className="card-icon">✅</div><div><p>Available</p><h3>{available}</h3></div></div>
                <div className="card"><div className="card-icon">🔄</div><div><p>Borrowed</p><h3>{borrowed}</h3></div></div>
                <div className="card"><div className="card-icon">👥</div><div><p>Members</p><h3>{members.length}</h3></div></div>
              </div>

              <div className="table-container">
                <h3>Recent Books</h3>
                <table>
                  <thead><tr><th>Cover</th><th>Title</th><th>Author</th><th>Status</th><th>Due Date</th></tr></thead>
                  <tbody>
                    {books.slice(-5).reverse().map(book => (
                      <tr key={book.id}>
                        <td><img className="book-cover small" src={book.cover_url} alt="" /></td>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td><span className={`status ${book.status.toLowerCase()}`}>{book.status}</span></td>
                        <td>{book.due_date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {page === 'books' && (
            <>
              <div className="page-title books-title">
                <div><h2>Books</h2><p>Manage books, covers and due dates</p></div>
                <button className="primary-button" onClick={openAddBook}>+ Add Book</button>
              </div>

              <div className="search-box">🔍<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, author or category..." /></div>

              <div className="table-container">
                <table>
                  <thead><tr><th>Cover</th><th>Title</th><th>Author</th><th>Category</th><th>Status</th><th>Due Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredBooks.map(book => (
                      <tr key={book.id}>
                        <td><img className="book-cover" src={book.cover_url} alt={book.title} /></td>
                        <td>{book.title}</td>
                        <td>{book.author}</td>
                        <td>{book.category}</td>
                        <td><span className={`status ${book.status.toLowerCase()}`}>{book.status}</span></td>
                        <td>{book.due_date || '-'}</td>
                        <td>
                          <button className="edit-button" onClick={() => openEditBook(book)}>Edit</button>
                          <button className="delete-button" onClick={() => deleteBook(book.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {page === 'members' && (
            <>
              <div className="page-title books-title">
                <div><h2>Members</h2><p>Manage library members</p></div>
                <button className="primary-button" onClick={() => { setMemberForm(emptyMember); setShowMemberForm(true) }}>+ Add Member</button>
              </div>

              <div className="table-container">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr></thead>
                  <tbody>
                    {members.map(member => (
                      <tr key={member.id}>
                        <td>{member.name}</td><td>{member.email}</td><td>{member.phone}</td>
                        <td><button className="delete-button" onClick={() => deleteMember(member.id)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {page === 'borrow' && (
            <>
              <div className="page-title">
                <h2>Borrow / Return</h2>
                <p>Change book availability and track due dates</p>
              </div>

              <div className="table-container">
                <table>
                  <thead><tr><th>Cover</th><th>Book</th><th>Author</th><th>Status</th><th>Due Date</th><th>Action</th></tr></thead>
                  <tbody>
                    {books.map(book => (
                      <tr key={book.id}>
                        <td><img className="book-cover" src={book.cover_url} alt="" /></td>
                        <td>{book.title}</td><td>{book.author}</td>
                        <td><span className={`status ${book.status.toLowerCase()}`}>{book.status}</span></td>
                        <td>{book.due_date || '-'}</td>
                        <td>
                          <button className={book.status === 'Available' ? 'borrow-button' : 'return-button'} onClick={() => toggleBook(book.id)}>
                            {book.status === 'Available' ? 'Borrow' : 'Return'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      {showBookForm && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-button" onClick={() => setShowBookForm(false)}>×</button>
            <h2>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
            <p className="modal-subtitle">Enter book details</p>

            <form onSubmit={saveBook}>
              <label>Book Title</label>
              <input required value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} placeholder="Enter title" />

              <label>Author</label>
              <input required value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} placeholder="Enter author" />

              <label>Category</label>
              <input required value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })} placeholder="Programming, Fiction..." />

              <label>Book Cover Image URL</label>
              <input value={bookForm.cover_url} onChange={e => setBookForm({ ...bookForm, cover_url: e.target.value })} placeholder="https://..." />

              <label>Due Date</label>
              <input type="date" value={bookForm.due_date} onChange={e => setBookForm({ ...bookForm, due_date: e.target.value })} />

              <div className="modal-buttons">
                <button type="button" className="cancel-button" onClick={() => setShowBookForm(false)}>Cancel</button>
                <button type="submit" className="save-button">{editingBook ? 'Update Book' : 'Add Book'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMemberForm && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-button" onClick={() => setShowMemberForm(false)}>×</button>
            <h2>Add New Member</h2>
            <p className="modal-subtitle">Enter member details</p>

            <form onSubmit={saveMember}>
              <label>Name</label>
              <input required value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Member name" />
              <label>Email</label>
              <input required type="email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} placeholder="Email" />
              <label>Phone</label>
              <input required value={memberForm.phone} onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} placeholder="Phone" />

              <div className="modal-buttons">
                <button type="button" className="cancel-button" onClick={() => setShowMemberForm(false)}>Cancel</button>
                <button type="submit" className="save-button">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
