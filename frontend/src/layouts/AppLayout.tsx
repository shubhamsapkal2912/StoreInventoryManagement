import { ChevronDown, LogOut, Menu, PackageSearch, ShoppingCart, User as UserIcon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { navFor } from './nav'

export function Brand({ light }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 text-lg font-bold ${light ? 'text-white' : 'text-slate-900'}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><PackageSearch className="h-5 w-5" aria-hidden /></span>
      StockPilot
    </span>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  if (!user) return null
  const profilePath = user.role === 'STORE_MANAGER' ? '/manager/profile' : '/shop/profile'
  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-4 text-slate-900">{user.fullName}</span>
          <span className="block text-xs text-slate-500">{user.role === 'STORE_MANAGER' ? 'Store manager' : 'Customer'}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-xs text-slate-500">{user.email}</p></div>
          <button role="menuitem" onClick={() => { setOpen(false); navigate(profilePath) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><UserIcon className="h-4 w-4" aria-hidden />Profile</button>
          <button role="menuitem" onClick={async () => { setOpen(false); await logout(); navigate('/login', { replace: true }) }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" aria-hidden />Log out</button>
        </div>
      )}
    </div>
  )
}

export function AppLayout() {
  const { user } = useAuth()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  if (!user) return null
  const items = navFor[user.role]

  const links = (
    <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-4">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}
          className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
          <Icon className="h-5 w-5" aria-hidden />{label}
          {to === '/shop/cart' && count > 0 && <span className="ml-auto rounded-full bg-white/20 px-2 text-xs">{count}</span>}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        <div className="px-5 py-5"><Brand light /></div>
        {links}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-64 flex-col bg-slate-900">
            <div className="flex items-center justify-between px-5 py-5">
              <Brand light />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-slate-300"><X className="h-5 w-5" /></button>
            </div>
            {links}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
            <span className="lg:hidden"><Brand /></span>
          </div>
          <div className="flex items-center gap-2">
            {user.role === 'CUSTOMER' && (
              <Link to="/shop/cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                <ShoppingCart className="h-5 w-5" />
                {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">{count}</span>}
              </Link>
            )}
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><Outlet /></div></main>
      </div>
    </div>
  )
}
