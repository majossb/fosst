from datetime import datetime

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.estandares.models import Estandar, Evaluacion
from apps.planes.mixins import PlanGatingMixin
from .models import Informe
from .serializers import InformeSerializer


def calcular_phva(respuestas, estandares):
    """Calcula puntaje por ciclo PHVA. Réplica exacta de helpers.ts."""
    ciclos = ["Planear", "Hacer", "Verificar", "Actuar"]
    resultado = {}

    for ciclo in ciclos:
        ests_ciclo = [e for e in estandares if e.ciclo_phva == ciclo]
        maximo = sum(float(e.puntaje_maximo) for e in ests_ciclo)

        obtenido = 0
        for est in ests_ciclo:
            resp = next((r for r in respuestas if r.estandar_id == est.id), None)
            if resp and resp.puntaje:
                obtenido += float(resp.puntaje)

        resultado[ciclo] = {
            "obtenido": round(obtenido, 2),
            "maximo": round(maximo, 2),
            "porcentaje": round((obtenido / maximo) * 100) if maximo > 0 else 0,
        }

    return resultado


def generar_recomendaciones(cumplimiento, respuestas, estandares):
    """Genera recomendaciones automáticas. Réplica de informe.controller.ts."""
    recomendaciones = []

    if cumplimiento < 60:
        recomendaciones.append(
            "Se recomienda implementar un plan de acción urgente para alcanzar al menos el 60% de cumplimiento."
        )

    no_cumple = [r for r in respuestas if r.estado == "no_cumple"]
    if no_cumple:
        recomendaciones.append(
            f"Existen {len(no_cumple)} estándares sin cumplir que requieren atención inmediata."
        )

    sin_evidencia = [
        r for r in respuestas
        if r.estado != "no_aplica" and (not hasattr(r, "evidencias") or r.evidencias.count() == 0)
    ]
    if sin_evidencia:
        recomendaciones.append(
            f"{len(sin_evidencia)} estándares carecen de evidencia documental. Se recomienda documentar el cumplimiento."
        )

    if cumplimiento >= 86:
        recomendaciones.append(
            "El nivel de cumplimiento es aceptable. Se recomienda mantener y mejorar continuamente."
        )

    return recomendaciones


class InformeListView(PlanGatingMixin, APIView):
    """GET /api/informes → lista informes de la empresa."""
    permission_classes = [IsAuthenticated]
    required_feature = "tiene_informes"

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        evaluacion_ids = list(
            Evaluacion.objects.filter(empresa=empresa).values_list("id", flat=True)
        )

        informes = Informe.objects.filter(
            evaluacion_id__in=evaluacion_ids,
            deleted_at__isnull=True,
        ).select_related("evaluacion").order_by("-fecha_elaboracion")

        serializer = InformeSerializer(informes, many=True)
        return Response(serializer.data)


class InformeGenerarView(PlanGatingMixin, APIView):
    """POST /api/informes/generar → genera informe con cálculos PHVA."""
    permission_classes = [IsAuthenticated]
    required_feature = "tiene_informes"

    def post(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        evaluacion_id = request.data.get("evaluacion_id")
        tipo = request.data.get("tipo")

        if not evaluacion_id or not tipo:
            return Response({"message": "evaluacion_id y tipo son requeridos."}, status=400)

        try:
            evaluacion = Evaluacion.objects.prefetch_related(
                "respuestas__estandar",
                "respuestas__evidencias",
                "hallazgos__auditor",
            ).get(id=evaluacion_id, empresa=empresa)
        except Evaluacion.DoesNotExist:
            return Response({"message": "Evaluación no encontrada."}, status=404)

        capitulo = empresa.capitulo_vigente or "II"
        estandares = list(Estandar.objects.filter(capitulo=capitulo))
        respuestas = list(evaluacion.respuestas.all())

        phva = calcular_phva(respuestas, estandares)

        puntaje_maximo = sum(float(e.puntaje_maximo) for e in estandares)
        puntaje_obtenido = sum(float(r.puntaje or 0) for r in respuestas)
        cumplimiento = round((puntaje_obtenido / puntaje_maximo) * 100) if puntaje_maximo > 0 else 0

        # Generar contenido estructurado del informe
        contenido = {
            "meta": {
                "tipo": tipo,
                "generado_en": datetime.now().isoformat(),
                "empresa": empresa.nombre,
                "nit": empresa.nit,
                "anio": evaluacion.anio,
                "capitulo": evaluacion.capitulo,
            },
            "resumen_ejecutivo": {
                "cumplimiento_global": cumplimiento,
                "puntaje_obtenido": round(puntaje_obtenido, 2),
                "puntaje_maximo": round(puntaje_maximo, 2),
                "total_estandares": len(estandares),
                "cumple": sum(1 for r in respuestas if r.estado == "cumple"),
                "no_cumple": sum(1 for r in respuestas if r.estado == "no_cumple"),
                "parcial": sum(1 for r in respuestas if r.estado == "parcial"),
            },
            "phva": phva,
            "estandares_detalle": [
                {
                    "codigo": r.estandar.codigo,
                    "nombre": r.estandar.nombre,
                    "ciclo": r.estandar.ciclo_phva,
                    "estado": r.estado,
                    "puntaje": float(r.puntaje or 0),
                    "puntaje_maximo": float(r.estandar.puntaje_maximo),
                    "observacion": r.observacion,
                    "evidencias": r.evidencias.count() if hasattr(r, "evidencias") else 0,
                }
                for r in respuestas
            ],
            "hallazgos": [
                {
                    "tipo": h.tipo,
                    "descripcion": h.descripcion,
                    "auditor": h.auditor.nombre if hasattr(h.auditor, "nombre") else str(h.auditor),
                    "fecha": h.created_at.isoformat(),
                }
                for h in evaluacion.hallazgos.all()
            ],
            "clasificacion": (
                "ACEPTABLE" if cumplimiento >= 86
                else "MODERADAMENTE ACEPTABLE" if cumplimiento >= 61
                else "CRÍTICO"
            ),
            "recomendaciones": generar_recomendaciones(cumplimiento, respuestas, estandares),
        }

        informe = Informe.objects.create(
            evaluacion=evaluacion,
            tipo=tipo,
            contenido_json=contenido,
        )

        from apps.auditoria.helpers import registrar_audit_log
        registrar_audit_log(request, "GENERAR_INFORME", tabla_afectada="informes", registro_id=informe.id, valores_nuevos={"tipo": tipo})

        serializer = InformeSerializer(informe)
        return Response(serializer.data, status=201)


class InformeDetalleView(PlanGatingMixin, APIView):
    """GET /api/informes/<id> → detalle de un informe."""
    permission_classes = [IsAuthenticated]
    required_feature = "tiene_informes"

    def get(self, request, informe_id):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        try:
            informe = Informe.objects.select_related("evaluacion").get(id=informe_id)
        except Informe.DoesNotExist:
            return Response({"message": "Informe no encontrado."}, status=404)

        if informe.evaluacion.empresa_id != empresa.id:
            return Response({"message": "Informe no encontrado."}, status=404)

        serializer = InformeSerializer(informe)
        return Response(serializer.data)
