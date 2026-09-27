import { ReactNode, useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/auth.context'
import { ROLE_LABELS } from '@/types'
import {
  LogOut, Bell, Shield, Menu, X, ChevronDown,
  LucideIcon,
} from 'lucide-react'

// ── Tipos ───────────────────────────────────────────────────────
export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  badge?: number | string
  badgeColor?: 'red' | 'orange' | 'blue'
}

export interface NavSection {
  title: string
  items: NavItem[]
}

interface AppShellProps {
  sections: NavSection[]
  topbarRight?: ReactNode
  children: ReactNode
  breadcrumb?: string
}

// ── Collapsible Section ─────────────────────────────────────────
function SidebarSection({
  section,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  section: NavSection
  isExpanded: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div className="mb-1">
      {/* Section header — click to toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full flex items-center justify-between
          px-3 py-2 rounded-lg
          text-[10px] font-extrabold uppercase tracking-[0.08em]
          transition-colors duration-150 select-none
          ${isExpanded
            ? 'text-primary-500 bg-primary-50/60'
            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
          }
        `}
      >
        <span className="truncate">{section.title}</span>
        <ChevronDown
          className={`
            w-3.5 h-3.5 flex-shrink-0 ml-1
            transition-transform duration-200
            ${isExpanded ? 'rotate-0' : '-rotate-90'}
          `}
        />
      </button>

      {/* Collapsible items */}
      <div
        className={`
          overflow-hidden transition-all duration-200 ease-in-out
          ${isExpanded ? 'max-h-[500px] opacity-100 mt-0.5' : 'max-h-0 opacity-0'}
        `}
      >
        {section.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={onNavigate}
            className={({ isActive }) => `
              flex items-center gap-2.5 pl-3 pr-2 py-[7px] rounded-lg text-[12px] font-semibold
              transition-all duration-150 group relative
              ${isActive
                ? 'bg-brand-500/10 text-primary-500 font-bold shadow-sm'
                : 'text-slate-600 hover:text-primary-500 hover:bg-slate-50'
              }
            `}
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500" />
                )}

                <item.icon
                  className={`w-[15px] h-[15px] flex-shrink-0 transition-colors ${
                    isActive ? 'text-brand-500' : 'text-slate-400 group-hover:text-primary-400'
                  }`}
                />

                <span className="flex-1 truncate" title={item.label}>
                  {item.label}
                </span>

                {item.badge !== undefined && (
                  <span
                    className={`
                      text-[9px] font-extrabold px-1.5 py-[1px] rounded-md leading-tight
                      ${item.badgeColor === 'red'
                        ? 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
                        : item.badgeColor === 'orange'
                          ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                          : 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'}
                    `}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

// ── Shell principal ─────────────────────────────────────────────
export function AppShell({ sections, topbarRight, children, breadcrumb }: AppShellProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Track which sections are expanded (by index)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())

  // Auto-expand the section containing the current route
  const findActiveSectionIndex = useCallback(() => {
    const path = location.pathname
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].items.some(item => {
        // Exact match or prefix match (for nested routes like perfiles-cargo/:id)
        return path === item.to || path.startsWith(item.to + '/')
      })) {
        return i
      }
    }
    return -1
  }, [location.pathname, sections])

  useEffect(() => {
    const activeIdx = findActiveSectionIndex()
    if (activeIdx >= 0) {
      setExpandedSections(prev => {
        // Only expand the active section, collapse others
        const next = new Set<number>()
        next.add(activeIdx)
        return next
      })
    }
  }, [location.pathname, findActiveSectionIndex])

  const toggleSection = (index: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeMobileSidebar = () => setSidebarOpen(false)

  const initials = user?.nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('') ?? '??'

  return (
    <div className="min-h-screen bg-surface flex font-sans">

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 h-screen w-[256px] bg-white border-r border-surface-2
          flex flex-col z-30 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* ── Header: Logo + Company ───────────────────────────────── */}
        <div className="px-4 pt-4 pb-3 border-b border-surface-2">
          <div className="flex items-center gap-2.5 mb-3">
            <img 
              src="/assets/logo-fosst-icon.png" 
              alt="FOSST Logo"
              className="w-9 h-9 object-contain rounded-md flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="font-extrabold text-lg text-primary-500 tracking-wide leading-none">FOSST</div>
              <div className="text-[9px] text-slate-400 font-semibold tracking-wide">V.I.D.A. · Res. 0312</div>
            </div>
          </div>

          {/* Company pill */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            <div className="text-primary-500 text-[11px] font-extrabold truncate leading-tight">
              {user?.empresa?.nombre ?? ''}
            </div>
            <div className="text-slate-400 text-[9px] font-semibold mt-0.5">
              NIT {user?.empresa?.nit ?? ''} · Cap. {user?.empresa?.capitulo_vigente ?? ''}
            </div>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
          {sections.map((section, idx) => (
            <SidebarSection
              key={section.title}
              section={section}
              isExpanded={expandedSections.has(idx)}
              onToggle={() => toggleSection(idx)}
              onNavigate={closeMobileSidebar}
            />
          ))}
        </nav>

        {/* ── User footer ──────────────────────────────────────────── */}
        <div className="px-3 py-3 border-t border-slate-100 bg-slate-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-500 text-white text-[11px] font-extrabold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-primary-500 text-[11px] font-bold truncate leading-tight">{user?.nombre}</div>
              <div className="text-slate-400 text-[9px] font-semibold truncate">
                {user ? ROLE_LABELS[user.rol] : ''}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-50"
              title="Cerrar sesión"
            >
              <LogOut className="w-[14px] h-[14px]" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-surface-2 px-5 h-14 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-slate-500 hover:text-primary-500"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-sm text-slate-500">
              <span className="font-semibold text-primary-500">DiagnostiSST</span>
              {breadcrumb && (
                <>
                  <span className="mx-2">›</span>
                  <span className="text-slate-700">{breadcrumb}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {topbarRight}
            <button className="relative text-slate-400 hover:text-primary-500 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}