import { useState } from 'react'
import { Card, PageHeader, Badge, Button, EmptyState } from '@/components/ui'
import { LoadingSpinner, ErrorDisplay } from '@/components/ui/forms'
import { useInformes, useGenerarInforme, useDashboardAud } from '@/hooks/useApi'
import { FileText, Plus, ClipboardCheck } from 'lucide-react'

export default function InformeAuditoriaView() {
  const { data, isLoading, error, refetch } = useInformes()
  const dashboard = useDashboardAud()
  const generarMut = useGenerarInforme()
  const [generando, setGenerando] = useState(false)

  if (isLoading) return <LoadingSpinner text="Cargando informes de auditoría..." />
  if (error || !data) return <ErrorDisplay message={(error as Error)?.message ?? 'Error'} onRetry={refetch} />

  const informesAuditoria = data.filter(i => i.tipo === 'auditoria')

  const handleGenerar = async () => {
    const evalId = dashboard.data?.evaluacion_id
    if (!evalId) return
    setGenerando(true)
    try {
      await generarMut.mutateAsync({ evaluacion_id: evalId, tipo: 'auditoria' })
    } finally { setGenerando(false) }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Informe de Auditoría" subtitle="Generación del informe final de auditoría"
        actions={
          <Button variant="primary" className="text-xs" onClick={handleGenerar} disabled={generando}>
            <Plus className="w-3 h-3" /> Generar informe
          </Button>
        }
      />

      {informesAuditoria.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin informes de auditoría"
          description="Genere el informe cuando haya completado la verificación"
        />
      ) : informesAuditoria.map(inf => {
        const c = inf.contenido_json as any
        return (
          <Card key={inf.id}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-primary-500">Informe de Auditoría</span>
                  <Badge variant="blue">{inf.evaluacion?.anio}</Badge>
                  {c?.clasificacion && <Badge variant={c.clasificacion === 'ACEPTABLE' ? 'green' : c.clasificacion === 'CRÍTICO' ? 'red' : 'orange'}>{c.clasificacion}</Badge>}
                </div>
                <div className="text-xs text-slate-500 mb-3">
                  Generado: {new Date(inf.fecha_elaboracion).toLocaleString('es-CO')}
                  {c?.resumen_ejecutivo && <span> · Cumplimiento: <strong className="text-primary-500">{c.resumen_ejecutivo.cumplimiento_global}%</strong></span>}
                </div>
                {c?.hallazgos?.length > 0 && (
                  <div className="mt-2 p-3 bg-surface rounded-xl border border-surface-2">
                    <div className="text-[10px] font-bold text-slate-500 mb-2">HALLAZGOS ({c.hallazgos.length})</div>
                    {c.hallazgos.slice(0, 5).map((h: any, i: number) => (
                      <div key={i} className="text-xs text-slate-600 mb-1 flex items-start gap-2">
                        <Badge variant={h.tipo.includes('no_conformidad') ? 'red' : h.tipo === 'fortaleza' ? 'green' : 'blue'}>
                          {h.tipo.replace(/_/g, ' ')}
                        </Badge>
                        <span className="truncate">{h.descripcion}</span>
                      </div>
                    ))}
                  </div>
                )}
                {c?.recomendaciones?.length > 0 && (
                  <div className="mt-2 p-3 bg-surface rounded-xl border border-surface-2">
                    <div className="text-[10px] font-bold text-slate-500 mb-1">RECOMENDACIONES</div>
                    {c.recomendaciones.map((rec: string, i: number) => (
                      <div key={i} className="text-xs text-slate-600 mb-0.5">• {rec}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
