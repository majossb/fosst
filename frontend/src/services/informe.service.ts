import { apiClient } from './api.client'
import type { Informe } from '@/types'

export const informeService = {
  listar: () => apiClient.get<Informe[]>('/informes'),

  generar: (data: {
    evaluacion_id: string; tipo: 'auditoria' | 'revision_alta_direccion' | 'ejecutivo'
  }) => apiClient.post<Informe>('/informes/generar', data),

  obtener: (id: string) => apiClient.get<Informe>(`/informes/${id}`),
}
