from datetime import datetime
from decimal import Decimal

from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import EmpresaScopedViewSet
from .models import Estandar, Evaluacion, Respuesta, Apelacion
from .serializers import (
    EstandarSerializer,
    EvaluacionSerializer,
    RespuestaSerializer,
    ApelacionSerializer,
)


def obtener_capitulo_empresa(empresa):
    if empresa.capitulo_vigente in ("I", "II", "III"):
        return empresa.capitulo_vigente
    from apps.empresas.views import clasificar_capitulo
    cap = clasificar_capitulo(empresa.num_trabajadores, empresa.nivel_riesgo)
    empresa.capitulo_vigente = cap
    empresa.save(update_fields=["capitulo_vigente"])
    return cap


# ── GET /api/estandares/ ──────────────────────────────────────────
class EstandarListView(APIView):
    """Lista estándares del capítulo vigente de la empresa."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        capitulo = obtener_capitulo_empresa(empresa)
        estandares = Estandar.objects.filter(capitulo=capitulo).order_by("ciclo_phva", "codigo")
        serializer = EstandarSerializer(estandares, many=True)
        return Response(serializer.data)


# ── GET /api/estandares/respuestas ────────────────────────────────
class EstandaresConRespuestasView(APIView):
    """Estándares + respuestas de la evaluación del año actual."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        anio_actual = datetime.now().year
        capitulo = obtener_capitulo_empresa(empresa)

        # Obtener o crear evaluación del año actual
        evaluacion, _ = Evaluacion.objects.get_or_create(
            empresa=empresa,
            anio=anio_actual,
            defaults={"capitulo": capitulo},
        )

        estandares = Estandar.objects.filter(capitulo=capitulo).order_by("ciclo_phva", "codigo")
        respuestas = Respuesta.objects.filter(evaluacion=evaluacion).select_related("estandar")

        # Indexar respuestas por estandar_id para O(1) lookup
        resp_map = {str(r.estandar_id): r for r in respuestas}

        resultado = []
        for est in estandares:
            resp = resp_map.get(str(est.id))
            evidencias_count = 0
            if resp and hasattr(resp, "evidencias"):
                evidencias_count = resp.evidencias.count()

            resultado.append({
                "estandar_id": est.id,
                "codigo": est.codigo,
                "nombre": est.nombre,
                "descripcion": est.descripcion,
                "ciclo_phva": est.ciclo_phva,
                "puntaje_maximo": float(est.puntaje_maximo),
                "obligatorio": est.obligatorio,
                "respuesta_id": resp.id if resp else None,
                "estado": resp.estado if resp else "sin_respuesta",
                "puntaje": float(resp.puntaje) if resp and resp.puntaje else 0,
                "observacion": resp.observacion if resp else "",
                "evidencias": evidencias_count,
            })

        return Response({
            "evaluacion_id": evaluacion.id,
            "capitulo": capitulo,
            "estandares": resultado,
        })


# ── PUT /api/estandares/respuesta/<estandar_id> ──────────────────
class ActualizarRespuestaView(APIView):
    """Crear o actualizar la respuesta de un estándar."""
    permission_classes = [IsAuthenticated]

    def put(self, request, estandar_id):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        estado = request.data.get("estado")
        observacion = request.data.get("observacion", "")
        puntaje = request.data.get("puntaje")

        # Verificar que el estándar existe
        try:
            estandar = Estandar.objects.get(id=estandar_id)
        except Estandar.DoesNotExist:
            return Response({"message": "Estándar no encontrado."}, status=404)

        anio_actual = datetime.now().year
        capitulo = empresa.capitulo_vigente or "II"

        # Obtener o crear evaluación
        evaluacion, _ = Evaluacion.objects.get_or_create(
            empresa=empresa,
            anio=anio_actual,
            defaults={"capitulo": capitulo},
        )

        # Calcular puntaje automático si no se envía
        if puntaje is None:
            max_pts = float(estandar.puntaje_maximo)
            puntaje_map = {
                "cumple": max_pts,
                "parcial": max_pts * 0.5,
                "no_aplica": max_pts,
            }
            puntaje_final = Decimal(str(puntaje_map.get(estado, 0)))
        else:
            puntaje_final = Decimal(str(puntaje))

        # Upsert de respuesta
        respuesta, created = Respuesta.objects.update_or_create(
            evaluacion=evaluacion,
            estandar=estandar,
            defaults={
                "estado": estado,
                "observacion": observacion,
                "puntaje": puntaje_final,
            },
        )

        # Recalcular puntaje total de la evaluación
        puntaje_total = (
            Respuesta.objects.filter(evaluacion=evaluacion)
            .aggregate(total=Sum("puntaje"))["total"]
            or 0
        )
        evaluacion.puntaje_total = puntaje_total
        evaluacion.save(update_fields=["puntaje_total"])

        serializer = RespuestaSerializer(respuesta)
        return Response({
            "respuesta": serializer.data,
            "puntaje_total_evaluacion": float(puntaje_total),
        })


# ── GET /api/evaluaciones/actual ──────────────────────────────────
class EvaluacionActualView(APIView):
    """Obtiene la evaluación del año actual (la crea si no existe)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        anio_actual = datetime.now().year
        capitulo = empresa.capitulo_vigente or "II"

        evaluacion, _ = Evaluacion.objects.get_or_create(
            empresa=empresa,
            anio=anio_actual,
            defaults={"capitulo": capitulo},
        )

        serializer = EvaluacionSerializer(evaluacion)
        return Response(serializer.data)


# ── GET /api/evaluaciones/historial ───────────────────────────────
class HistorialEvaluacionesView(APIView):
    """Historial de evaluaciones de la empresa."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        evaluaciones = Evaluacion.objects.filter(empresa=empresa).order_by("-anio")
        data = []
        for ev in evaluaciones:
            data.append({
                "id": ev.id,
                "anio": ev.anio,
                "capitulo": ev.capitulo,
                "puntaje_total": float(ev.puntaje_total) if ev.puntaje_total else None,
                "estado": ev.estado,
                "fecha_completado": ev.fecha_completado,
                "created_at": ev.created_at,
                "respuestas_count": ev.respuestas.count(),
                "hallazgos_count": ev.hallazgos.count() if hasattr(ev, "hallazgos") else 0,
            })
        return Response(data)


# ── GET /api/evaluaciones/<id>/resumen ────────────────────────────
class ResumenEvaluacionView(APIView):
    """Resumen de una evaluación específica."""
    permission_classes = [IsAuthenticated]

    def get(self, request, evaluacion_id):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        try:
            evaluacion = Evaluacion.objects.prefetch_related(
                "respuestas__estandar"
            ).get(id=evaluacion_id, empresa=empresa)
        except Evaluacion.DoesNotExist:
            return Response({"message": "Evaluación no encontrada."}, status=404)

        respuestas = evaluacion.respuestas.all()
        puntaje_maximo = sum(float(r.estandar.puntaje_maximo) for r in respuestas)
        puntaje_obtenido = sum(float(r.puntaje or 0) for r in respuestas)

        serializer = EvaluacionSerializer(evaluacion)
        return Response({
            **serializer.data,
            "resumen": {
                "puntaje_maximo": puntaje_maximo,
                "puntaje_obtenido": puntaje_obtenido,
                "porcentaje": round((puntaje_obtenido / puntaje_maximo) * 100) if puntaje_maximo > 0 else 0,
                "total_respuestas": len(respuestas),
                "cumple": sum(1 for r in respuestas if r.estado == "cumple"),
                "no_cumple": sum(1 for r in respuestas if r.estado == "no_cumple"),
                "parcial": sum(1 for r in respuestas if r.estado == "parcial"),
            },
        })


# ── ViewSet de Apelaciones ────────────────────────────────────────
class ApelacionViewSet(EmpresaScopedViewSet):
    queryset = Apelacion.objects.select_related("respuesta", "solicitante")
    serializer_class = ApelacionSerializer
    empresa_field = "respuesta__evaluacion__empresa"

    def perform_create(self, serializer):
        serializer.save(solicitante=self.request.user)
