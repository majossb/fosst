import { useState, useEffect } from 'react'
import { Card, Button } from '@/components/ui'
import {
  gestionHumanaService,
  Trabajador,
  ExpedienteConsolidado,
  NovedadLaboral,
  ExamenMedico,
} from '@/services/gestion-humana.service'
import {
  Users, Stethoscope, FileText, Calendar, Plus,
  CheckCircle2, AlertCircle, ArrowRight, X, ShieldAlert
} from 'lucide-react'

export default function GestionHumanaView() {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null)
  const [expediente, setExpediente] = useState<ExpedienteConsolidado | null>(null)
  const [loadingExpediente, setLoadingExpediente] = useState(false)

  // Modals state
  const [showNovedadModal, setShowNovedadModal] = useState(false)
  const [showExamenModal, setShowExamenModal] = useState(false)

  useEffect(() => {
    cargarTrabajadores()
  }, [])

  const cargarTrabajadores = async () => {
    setLoading(true)
    try {
      const res = await gestionHumanaService.getTrabajadores()
      setTrabajadores(Array.isArray(res) ? res : res.results || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const verExpediente = async (trabajador: Trabajador) => {
    setSelectedTrabajador(trabajador)
    setLoadingExpediente(true)
    try {
      const exp = await gestionHumanaService.getExpediente(trabajador.id)
      setExpediente(exp)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingExpediente(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Gestión Humana y Administración Laboral
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Expediente consolidado del trabajador: contratación, novedades laborales, exámenes médicos y licencias.
          </p>
        </div>
      </div>

      {/* Main Grid: Directory & Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workers Directory */}
        <div className={selectedTrabajador ? "lg:col-span-1 space-y-4" : "lg:col-span-3 space-y-4"}>
          <Card className="p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary-500" />
              Directorio de Trabajadores ({trabajadores.length})
            </h3>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Cargando directorio...</div>
            ) : trabajadores.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No se registran trabajadores activos.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
                {trabajadores.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => verExpediente(t)}
                    className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between rounded-lg ${
                      selectedTrabajador?.id === t.id ? 'bg-primary-50 border border-primary-200' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-900">{t.nombre}</p>
                      <p className="text-xs text-slate-500">{t.cargo || 'Sin cargo'} • Doc: {t.documento}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">
                          {t.estado_contractual || 'Activo'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                          t.estado_operativo === 'habilitado' ? 'bg-emerald-100 text-emerald-700' :
                          t.estado_operativo === 'no_apto' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {t.estado_operativo || 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Dossier Viewer */}
        {selectedTrabajador && (
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5 space-y-6">
              {/* Top Dossier Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTrabajador.nombre}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Documento: <span className="font-mono text-slate-700 font-medium">{selectedTrabajador.documento}</span> •
                    Cargo: <span className="font-medium text-slate-700">{selectedTrabajador.cargo || 'No asignado'}</span> •
                    Vinculación: <span className="font-medium text-slate-700 capitalize">{selectedTrabajador.tipo_contrato || 'Fijo'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTrabajador(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingExpediente ? (
                <div className="py-12 text-center text-slate-400 text-sm">Cargando expediente consolidado...</div>
              ) : expediente && (
                <div className="space-y-6">
                  {/* Medical Exams Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-primary-500" />
                        Historial de Exámenes Médicos Ocupacionales ({expediente.examenes_medicos.length})
                      </h4>
                    </div>

                    {expediente.examenes_medicos.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                        No registra exámenes médicos.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {expediente.examenes_medicos.map((ex) => (
                          <div key={ex.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-800 capitalize">
                                  Examen {ex.tipo_display || ex.tipo}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                  ex.concepto_aptitud === 'apto' ? 'bg-emerald-100 text-emerald-700' :
                                  ex.concepto_aptitud === 'no_apto' ? 'bg-rose-100 text-rose-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {ex.concepto_aptitud_display || ex.concepto_aptitud}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                Fecha: {ex.fecha_examen} {ex.fecha_vencimiento && `• Vence: ${ex.fecha_vencimiento}`}
                              </p>
                              {ex.presenta_restricciones && (
                                <p className="text-xs text-rose-600 font-medium pt-0.5 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Restricciones: {ex.descripcion_restricciones}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Labor Novelties Section */}
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary-500" />
                        Novedades Laborales (Vacaciones, Incapacidades, Licencias)
                      </h4>
                    </div>

                    {expediente.novedades.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                        No registra novedades laborales en el periodo.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {expediente.novedades.map((nov) => (
                          <div key={nov.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between">
                            <div>
                              <span className="text-xs font-semibold text-slate-800 capitalize">
                                {nov.tipo_display || nov.tipo}
                              </span>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Periodo: {nov.fecha_inicio} al {nov.fecha_fin || 'Vigente'} {nov.dias ? `(${nov.dias} días)` : ''}
                              </p>
                              {nov.observaciones && (
                                <p className="text-xs text-slate-600 mt-1">{nov.observaciones}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Driver Licenses Section */}
                  {expediente.licencias_conduccion.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Licencias de Conducción
                      </h4>
                      <div className="space-y-2">
                        {expediente.licencias_conduccion.map((lic) => (
                          <div key={lic.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-800">Categoría {lic.categoria}</span>
                              <p className="text-slate-500">Vencimiento: {lic.fecha_vencimiento}</p>
                            </div>
                            {lic.presenta_restricciones && (
                              <span className="text-rose-600 font-medium">Con restricciones</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
