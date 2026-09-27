import { apiClient } from './api.client'
import type { EstandarMinimo } from '@/types'

interface EstandaresConRespuestasResponse {
  evaluacion_id: string
  capitulo: string
  estandares: EstandarMinimo[]
}

export const estandarService = {
  listar: () => apiClient.get<any[]>('/estandares'),

  conRespuestas: () => apiClient.get<EstandaresConRespuestasResponse>('/estandares/respuestas'),

  actualizarRespuesta: (estandarId: string, data: {
    estado: string; observacion?: string; puntaje?: number
  }) => apiClient.put<any>(`/estandares/respuesta/${estandarId}`, data),
}
