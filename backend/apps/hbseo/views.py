from django.db.models import Count
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import EmpresaScopedViewSet
from .models import Brecha, BrechaAccion
from .serializers import (
    BrechaListSerializer,
    BrechaDetailSerializer,
    BrechaUpdateSerializer,
    BrechaAccionSerializer,
)


class BrechaViewSet(EmpresaScopedViewSet):
    """
    ViewSet para gestión de Brechas.

    Las brechas NO se crean por API directamente — se crean exclusivamente via
    hbseo.services.registrar_o_vincular_brecha() desde los módulos que detectan
    condiciones (MICHC, Formación, Gestión Humana, SST, etc.).

    Este viewset expone:
      - GET  /api/hbseo/brechas/           → listado con filtros
      - GET  /api/hbseo/brechas/{id}/      → detalle con orígenes, eventos, acciones
      - PATCH /api/hbseo/brechas/{id}/     → actualizar campos editables
      - GET  /api/hbseo/brechas/resumen/   → contadores por estado y clasificación
    """
    queryset = Brecha.objects.all()
    serializer_class = BrechaListSerializer
    filterset_fields = ["estado", "clasificacion", "nivel_atencion", "trabajador"]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()

        # Annotate para el listado
        qs = qs.annotate(origenes_count=Count("origenes"))

        # Filtro adicional por módulo de origen (query param, no filterset)
        modulo_origen = self.request.query_params.get("modulo_origen")
        if modulo_origen:
            qs = qs.filter(origenes__modulo_origen=modulo_origen).distinct()

        # Filtro por responsable
        responsable_id = self.request.query_params.get("responsable_id")
        if responsable_id:
            qs = qs.filter(responsable_seguimiento_id=responsable_id)

        return qs.select_related(
            "trabajador", "responsable_seguimiento", "sede", "proceso",
        ).prefetch_related("origenes")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return BrechaDetailSerializer
        if self.action == "partial_update":
            return BrechaUpdateSerializer
        return BrechaListSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Prefetch all relations for detail view
        qs = Brecha.objects.filter(pk=instance.pk).prefetch_related(
            "origenes__content_type",
            "eventos__usuario",
            "acciones",
        )
        instance = qs.first()
        serializer = BrechaDetailSerializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def resumen(self, request):
        """Contadores por estado y clasificación para dashboard."""
        qs = self.get_queryset()

        por_estado = {}
        for estado_val, estado_label in Brecha.Estado.choices:
            por_estado[estado_val] = qs.filter(estado=estado_val).count()

        por_clasificacion = {}
        for clas_val, clas_label in Brecha.Clasificacion.choices:
            count = qs.filter(clasificacion=clas_val).count()
            if count > 0:
                por_clasificacion[clas_val] = count

        por_nivel = {}
        for nivel_val, nivel_label in Brecha.NivelAtencion.choices:
            count = qs.filter(nivel_atencion=nivel_val).count()
            if count > 0:
                por_nivel[nivel_val] = count

        return Response({
            "total": qs.count(),
            "por_estado": por_estado,
            "por_clasificacion": por_clasificacion,
            "por_nivel_atencion": por_nivel,
        })


class BrechaAccionViewSet(EmpresaScopedViewSet):
    """
    Gestión de acciones programadas para brechas.

    Se accede como recurso anidado: /api/hbseo/brechas/{brecha_id}/acciones/
    """
    queryset = BrechaAccion.objects.all()
    serializer_class = BrechaAccionSerializer
    empresa_field = "brecha__empresa"

    def get_queryset(self):
        qs = super().get_queryset()
        brecha_id = self.kwargs.get("brecha_pk")
        if brecha_id:
            qs = qs.filter(brecha_id=brecha_id)
        return qs

    def perform_create(self, serializer):
        brecha_id = self.kwargs.get("brecha_pk")
        if brecha_id:
            serializer.save(brecha_id=brecha_id)
        else:
            serializer.save()
