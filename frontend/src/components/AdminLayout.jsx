import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/admin',           label: '📊 대시보드',  end: true },
  { to: '/admin/students',  label: '👥 학생 목록' },
  { to: '/admin/placement', label: '🏫 반 배정' },
]

export default function AdminLayout({ children }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-800 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-6 border-b border-slate-700">
          <div className="text-2xl mb-1">🎤</div>
          <p className="font-bold text-sm leading-tight">Speaking Test</p>
          <p className="text-slate-400 text-xs">Admin Panel</p>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400
                       hover:bg-slate-700 hover:text-white transition-colors"
          >
            🚪 로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
