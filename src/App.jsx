import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './components/Dashboard.jsx'
import Upload from './components/Upload.jsx'
import DocumentDetail from './components/DocumentDetail.jsx'
import './App.css'

function NavBar() {
  return (
    <nav className="nav-bar">
      <span className="nav-brand">עוזר מסמכי המשרד</span>
      <div className="nav-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          לוח בקרה
        </NavLink>
        <NavLink
          to="/upload"
          className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
        >
          העלאה
        </NavLink>
      </div>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <NavBar />
        <main className="page">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/document/:id" element={<DocumentDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
