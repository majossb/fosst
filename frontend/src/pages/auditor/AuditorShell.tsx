import { Outlet } from 'react-router-dom'
import { AppShell, NavSection } from '@/components/layout/AppShell'
import { Button } from '@/components/ui'
import { Eye, FileText, ClipboardCheck, AlertCircle, BarChart2, History, Pencil } from 'lucide-react'

// ── Navegación declarativa ──────────────────────────────────────
const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Verificación',
    items: [
      { label: 'Verificación Cumplimiento', to: '/app/auditor',                  icon: Eye           },
      { label: 'Ver Evidencias Cargadas',   to: '/app/auditor/evidencias',        icon: FileText      },
      { label: 'Ver Autoevaluación',        to: '/app/auditor/autoevaluacion',    icon: ClipboardCheck},
      { label: 'Ver Riesgos e Indicadores', to: '/app/auditor/riesgos',           icon: BarChart2     },
    ],
  },
  {
    title: 'Mi Auditoría',
    items: [
      { label: 'Mis Hallazgos',    to: '/app/auditor/hallazgos', icon: AlertCircle, badge: 4, badgeColor: 'red'    },
      { label: 'Informe Final',    to: '/app/auditor/informe',   icon: FileText                                    },
      { label: 'Historial',        to: '/app/auditor/historial', icon: History                                     },
    ],
  },
]

// ── Shell (layout route — renderiza Outlet para los hijos) ──────
export default function AuditorShell() {
  return (
    <AppShell
      sections={NAV_SECTIONS}
      topbarRight={
        <>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-primary-500 border border-slate-200 px-2.5 py-1 rounded-lg">
            <Eye className="w-3.5 h-3.5" />
            SOLO LECTURA
          </span>
          <Button variant="ghost" icon={Pencil} className="text-xs py-1.5">Nuevo hallazgo</Button>
          <Button variant="primary" icon={FileText} className="text-xs py-1.5">Informe final</Button>
        </>
      }
    >
      <Outlet />
    </AppShell>
  )
}
