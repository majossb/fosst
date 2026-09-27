from datetime import datetime

from dateutil.relativedelta import relativedelta
from django.db.models import Count
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.common.mixins import EmpresaScopedViewSet
from apps.estandares.models import Evaluacion
from .models import Hallazgo, PlanMejora
from .serializers import HallazgoSerializer, PlanMejoraSerializer


def calcular_fecha_limite(prioridad: str) -> datetime:
    """RN-05: urgente=3 meses, importante=6 meses, aceptable=12 meses."""
    meses_map = {"urgente": 3, "importante": 6, "aceptable": 12}
    return datetime.now() + relativedelta(months=meses_map.get(prioridad, 6))


class HallazgoViewSet(EmpresaScopedViewSet):
    """Se filtra por empresa a través de la evaluación (no tiene FK directa a empresa)."""
    queryset = Hallazgo.objects.select_related("evaluacion", "auditor")
    serializer_class = HallazgoSerializer
    empresa_field = "evaluacion__empresa"

    def list(self, request, *args, **kwargs):
        """Retorna hallazgos del año actual envueltos con metadata,
        replicando la forma del Express original."""
        empresa = request.user.empresa
        if not empresa:
            return Response({"hallazgos": [], "total": 0, "evaluacion_id": None})

        anio_actual = datetime.now().year
        evaluacion = Evaluacion.objects.filter(
            empresa=empresa, anio=anio_actual
        ).first()

        if not evaluacion:
            return Response({"hallazgos": [], "total": 0, "evaluacion_id": None})

        hallazgos = Hallazgo.objects.filter(
            evaluacion=evaluacion
        ).select_related("auditor").order_by("-created_at")

        serializer = self.get_serializer(hallazgos, many=True)
        return Response({
            "hallazgos": serializer.data,
            "total": len(serializer.data),
            "evaluacion_id": str(evaluacion.id),
        })

    def perform_create(self, serializer):
        serializer.save(auditor=self.request.user)

    def perform_update(self, serializer):
        """SEC-01: Solo el auditor que creó el hallazgo puede editarlo."""
        instance = self.get_object()
        if instance.auditor_id != self.request.user.id:
            raise PermissionDenied("Solo el auditor que registró el hallazgo puede editarlo.")
        serializer.save()

    def perform_destroy(self, instance):
        """SEC-01: Solo el auditor que creó el hallazgo puede eliminarlo."""
        if instance.auditor_id != self.request.user.id:
            raise PermissionDenied("Solo el auditor que registró el hallazgo puede eliminarlo.")
        super().perform_destroy(instance)


class PlanMejoraViewSet(EmpresaScopedViewSet):
    queryset = PlanMejora.objects.select_related("evaluacion", "empresa")
    serializer_class = PlanMejoraSerializer
    filterset_fields = ["estado", "prioridad"]

    def list(self, request, *args, **kwargs):
        """Retorna planes envueltos con resumen, replicando la forma del Express original."""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        planes = serializer.data

        empresa = request.user.empresa
        por_estado = list(
            PlanMejora.objects.filter(empresa=empresa, deleted_at__isnull=True)
            .values("estado")
            .annotate(_count=Count("id"))
        )

        return Response({
            "planes": planes,
            "resumen": {"por_estado": por_estado},
        })

    def perform_create(self, serializer):
        """RN-05: fecha_limite automática según prioridad."""
        prioridad = self.request.data.get("prioridad", "importante")
        serializer.save(
            empresa=self.request.user.empresa,
            fecha_limite=calcular_fecha_limite(prioridad),
        )

    def perform_update(self, serializer):
        """Si cambia la prioridad, recalcular fecha_limite."""
        nueva_prioridad = self.request.data.get("prioridad")
        instance = self.get_object()

        kwargs = {}
        if nueva_prioridad and nueva_prioridad != instance.prioridad:
            kwargs["fecha_limite"] = calcular_fecha_limite(nueva_prioridad)

        serializer.save(**kwargs)

    @action(detail=False, methods=["get"], url_path="resumen")
    def resumen(self, request):
        """GET /api/plan-mejora/resumen → conteos por estado y prioridad."""
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        por_estado = list(
            PlanMejora.objects.filter(empresa=empresa, deleted_at__isnull=True)
            .values("estado")
            .annotate(_count=Count("id"))
        )

        por_prioridad = list(
            PlanMejora.objects.filter(empresa=empresa, deleted_at__isnull=True)
            .exclude(estado="completado")
            .values("prioridad")
            .annotate(_count=Count("id"))
        )

        return Response({
            "por_estado": por_estado,
            "por_prioridad": por_prioridad,
        })
