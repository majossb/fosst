from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import EmpresaScopedViewSet
from apps.planes.mixins import PlanGatingMixin
from .models import CalendarioActividad, Incidente, Notificacion
from .serializers import CalendarioActividadSerializer, IncidenteSerializer, NotificacionSerializer


class IncidenteViewSet(EmpresaScopedViewSet):
    queryset = Incidente.objects.all()
    serializer_class = IncidenteSerializer
    filterset_fields = ["tipo", "estado_investigacion"]


class CalendarioActividadViewSet(PlanGatingMixin, EmpresaScopedViewSet):
    queryset = CalendarioActividad.objects.all()
    serializer_class = CalendarioActividadSerializer
    filterset_fields = ["tipo", "completada"]
    required_feature = "tiene_calendario"


class NotificacionViewSet(EmpresaScopedViewSet):
    """Además del CRUD normal, cada usuario solo ve SUS notificaciones
    (o las generales de su empresa con usuario=null)."""
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.rol != "ADMIN":
            from django.db.models import Q
            qs = qs.filter(Q(usuario=user) | Q(usuario__isnull=True))
        return qs

    @action(detail=True, methods=["post"])
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=["leida"])
        return Response(NotificacionSerializer(notificacion).data)
