import { useState } from 'react'
import { Card, PageHeader, Badge, Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyState } from '@/components/ui'
import { LoadingSpinner, ErrorDisplay, Select } from '@/components/ui/forms'
import { useEstandaresConRespuestas, useActualizarRespuesta } from '@/hooks/useApi'
import { Check, X, AlertTriangle, Pencil, Minus } from 'lucide-react'
import type { EstadoCumplimiento } from '@/types'

const ESTADO_OPTIONS = [
  { value: 'cumple', label: 'Cumple' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'no_cumple', label: 'No cumple' },
  { value: 'no_aplica', label: 'No aplica' },
]

export default function EstandaresView() {
  const { data, isLoading, error, refetch } = useEstandaresConRespuestas()
  const actualizarMut = useActualizarRespuesta()
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState({ estado: '' as string, observacion: '' })

  if (isLoading) return <LoadingSpinner text="Cargando estándares..." />
  if (error || !data) return <ErrorDisplay message={(error as Error)?.message ?? 'Error'} onRetry={refetch} />

  const { estandares, capitulo } = data

  const ciclos = ['Planear', 'Hacer', 'Verificar', 'Actuar']
  const agrupados = ciclos.map((c) => ({
    ciclo: c,
    items: estandares.filter((e) => e.ciclo_phva === c),
  })).filter((g) => g.items.length > 0)

  const handleGuardar = async (estandarId: string) => {
    await actualizarMut.mutateAsync({
      estandarId,
      data: { estado: form.estado as EstadoCumplimiento, observacion: form.observacion },
    })
    setEditando(null)
  }

  const abrirEditor = (estandarId: string, estado: string, obs: string) => {
    setEditando(estandarId)
    setForm({ estado: estado === 'sin_respuesta' ? 'no_cumple' : estado, observacion: obs })
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'cumple':
        return <Badge variant="green" icon={Check}>Cumple</Badge>
      case 'parcial':
        return <Badge variant="orange" icon={AlertTriangle}>Parcial</Badge>
      case 'no_cumple':
        return <Badge variant="red" icon={X}>No cumple</Badge>
      default:
        return <Badge variant="gray" icon={Minus}>No aplica</Badge>
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title={`Estándares Mínimos — Capítulo ${capitulo}`} subtitle="Res. 0312/2019 · Diligenciamiento interactivo de estándares" />

      {agrupados.length === 0 ? (
        <EmptyState title="Sin estándares" description="No hay estándares configurados para mostrar." />
      ) : (
        agrupados.map(({ ciclo, items }) => (
          <Card key={ciclo} title={ciclo.toUpperCase()} subtitle={`${items.length} estándares · ${items.filter((e) => e.estado === 'cumple').length} cumplidos`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead>Estándar</TableHead>
                  <TableHead className="text-center w-16">Pts</TableHead>
                  <TableHead className="text-center w-28">Estado</TableHead>
                  <TableHead className="text-center w-16">%</TableHead>
                  <TableHead className="text-center w-20">Evidencias</TableHead>
                  <TableHead className="text-right w-24">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((est) => {
                  const isEditing = editando === est.estandar_id
                  return (
                    <TableRow key={est.estandar_id}>
                      <TableCell className="font-bold text-slate-900 font-mono">{est.codigo}</TableCell>
                      <TableCell className="max-w-xs sm:max-w-md">
                        <div className="font-semibold text-slate-800" title={est.nombre}>{est.nombre}</div>
                        {est.observacion && <div className="text-[11px] text-slate-500 mt-0.5">{est.observacion}</div>}
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-600">{est.puntaje_maximo}</TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <Select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={ESTADO_OPTIONS} className="text-xs py-1" />
                        ) : (
                          getEstadoBadge(est.estado)
                        )}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        <span className={est.porcentaje! >= 80 ? 'text-emerald-700' : est.porcentaje! >= 50 ? 'text-amber-700' : 'text-rose-600'}>
                          {est.porcentaje ?? 0}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="blue">{est.evidencias}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1.5 justify-end">
                            <Button variant="primary" icon={Check} className="text-xs py-1 px-2.5" onClick={() => handleGuardar(est.estandar_id)} disabled={actualizarMut.isPending}>
                              Guardar
                            </Button>
                            <Button variant="ghost" icon={X} className="text-xs py-1 px-2" onClick={() => setEditando(null)}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" icon={Pencil} className="text-xs py-1 px-3" onClick={() => abrirEditor(est.estandar_id, est.estado, est.observacion)}>
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        ))
      )}
    </div>
  )
}
