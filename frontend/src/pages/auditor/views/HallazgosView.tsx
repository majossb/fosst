import { useState } from 'react'
import { Card, PageHeader, Badge, Button, EmptyState } from '@/components/ui'
import { LoadingSpinner, ErrorDisplay, Modal, FormField, Select, Textarea } from '@/components/ui/forms'
import { useHallazgos, useCrearHallazgo, useEliminarHallazgo, useDashboardAud } from '@/hooks/useApi'
import { Plus, AlertTriangle, AlertCircle, Eye, Star, Trash2 } from 'lucide-react'
import type { TipoHallazgo } from '@/types'

const TIPO_CONFIG: Record<string, { label: string; variant: 'red' | 'orange' | 'blue' | 'green'; icon: any }> = {
  no_conformidad_mayor: { label: 'No conformidad mayor', variant: 'red', icon: AlertTriangle },
  no_conformidad_menor: { label: 'No conformidad menor', variant: 'orange', icon: AlertCircle },
  observacion:          { label: 'Observación',          variant: 'blue', icon: Eye },
  oportunidad_mejora:   { label: 'Oportunidad de mejora', variant: 'blue', icon: Star },
  fortaleza:            { label: 'Fortaleza',            variant: 'green', icon: Star },
}

export default function HallazgosView() {
  const { data, isLoading, error, refetch } = useHallazgos()
  const dashboard = useDashboardAud()
  const crearMut = useCrearHallazgo()
  const elimMut = useEliminarHallazgo()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ descripcion: '', tipo: 'observacion' as TipoHallazgo })
  const [filtro, setFiltro] = useState('todos')

  if (isLoading) return <LoadingSpinner text="Cargando hallazgos..." />
  if (error || !data) return <ErrorDisplay message={(error as Error)?.message ?? 'Error'} onRetry={refetch} />

  const { hallazgos, total, evaluacion_id } = data
  const filtrados = filtro === 'todos' ? hallazgos : hallazgos.filter(h => h.tipo === filtro)

  const handleCrear = async () => {
    if (!form.descripcion.trim()) {
      alert('La descripción del hallazgo es obligatoria')
      return
    }
    const evalId = evaluacion_id || dashboard.data?.evaluacion_id
    if (!evalId) {
      alert('No se encontró una evaluación activa para asociar el hallazgo')
      return
    }
    await crearMut.mutateAsync({ evaluacion_id: evalId, descripcion: form.descripcion.trim(), tipo: form.tipo })
    setModalOpen(false)
    setForm({ descripcion: '', tipo: 'observacion' })
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader 
        title="Mis Hallazgos" 
        subtitle={`${total} hallazgos registrados para la evaluación actual`}
        actions={
          <Button 
            variant="primary" 
            className="text-xs" 
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setModalOpen(true)}
          >
            Registrar Hallazgo
          </Button>
        }
      />

      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
          const count = hallazgos.filter(h => h.tipo === key).length
          return (
            <button 
              key={key} 
              onClick={() => setFiltro(key === filtro ? 'todos' : key)} 
              className={`bg-white border rounded-xl p-3 text-center transition-all shadow-sm ${filtro === key ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-surface-2 hover:border-surface-3'}`}
            >
              <cfg.icon className={`w-5 h-5 mx-auto mb-1 ${filtro === key ? 'text-brand-700' : 'text-slate-400'}`} />
              <div className="text-xl font-black text-primary-500">{count}</div>
              <div className="text-[10px] text-slate-500">{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtrados.length === 0 ? (
          <EmptyState
            icon={<AlertCircle className="w-7 h-7" />}
            title="Sin hallazgos"
            description={filtro === 'todos' ? 'No se han registrado hallazgos en la evaluación actual.' : `No hay hallazgos del tipo "${TIPO_CONFIG[filtro]?.label || filtro}".`}
            action={
              <Button 
                variant="primary" 
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setModalOpen(true)}
              >
                Registrar Hallazgo
              </Button>
            }
          />
        ) : filtrados.map(h => {
          const cfg = TIPO_CONFIG[h.tipo] ?? TIPO_CONFIG.observacion
          return (
            <Card key={h.id}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  cfg.variant === 'red' ? 'bg-red-50 text-red-600' :
                  cfg.variant === 'orange' ? 'bg-amber-50 text-amber-700' :
                  cfg.variant === 'green' ? 'bg-green-50 text-green-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  <cfg.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>
                  <div className="text-sm text-primary-500 mt-1">{h.descripcion}</div>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Registrado: {new Date(h.created_at).toLocaleString('es-CO')}
                    {h.auditor && <span> · Por: {h.auditor.nombre}</span>}
                  </div>
                </div>
                <button 
                  onClick={() => elimMut.mutate(h.id)} 
                  className="text-slate-400 hover:text-red-600 transition-colors flex-shrink-0 p-1"
                  title="Eliminar hallazgo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Hallazgo" footer={
        <>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleCrear} disabled={crearMut.isPending}>Registrar</Button>
        </>
      }>
        <FormField label="Tipo de hallazgo" required>
          <Select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value as TipoHallazgo})} options={
            Object.entries(TIPO_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))
          } />
        </FormField>
        <FormField label="Descripción" required>
          <Textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Describir el hallazgo de la auditoría..." rows={5} />
        </FormField>
      </Modal>
    </div>
  )
}
