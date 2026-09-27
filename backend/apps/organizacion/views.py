from rest_framework.decorators import action
from rest_framework.response import Response
from apps.common.mixins import EmpresaScopedViewSet
from .models import NodoOrganigrama, Proceso, Sede
from .serializers import NodoOrganigramaSerializer, ProcesoSerializer, SedeSerializer


class SedeViewSet(EmpresaScopedViewSet):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer
    filterset_fields = ["activa", "ciudad"]


class NodoOrganigramaViewSet(EmpresaScopedViewSet):
    """
    Soporta ?padre_id=<uuid> para traer solo los hijos directos de un nodo
    (útil para renderizar el árbol de forma perezosa en el frontend) y
    ?padre_id=null para traer la raíz.
    """
    queryset = NodoOrganigrama.objects.all()
    serializer_class = NodoOrganigramaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        padre_id = self.request.query_params.get("padre_id")
        if padre_id == "null":
            return qs.filter(padre__isnull=True)
        if padre_id:
            return qs.filter(padre_id=padre_id)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'padre_id' in data and (data['padre_id'] == "" or data['padre_id'] is None):
            data['padre_id'] = None
        if 'padre' in data and (data['padre'] == "" or data['padre'] is None):
            data['padre'] = None
        if 'area' in data and data['area'] == "":
            data['area'] = None
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if 'padre_id' in data and (data['padre_id'] == "" or data['padre_id'] is None):
            data['padre_id'] = None
        if 'padre' in data and (data['padre'] == "" or data['padre'] is None):
            data['padre'] = None
        if 'area' in data and data['area'] == "":
            data['area'] = None
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class ProcesoViewSet(EmpresaScopedViewSet):
    queryset = Proceso.objects.all()
    serializer_class = ProcesoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        padre_id = self.request.query_params.get("padre_id")
        if padre_id == "null":
            return qs.filter(padre__isnull=True)
        if padre_id:
            return qs.filter(padre_id=padre_id)
        return qs

    def list(self, request, *args, **kwargs):
        padre_id = request.query_params.get("padre_id")
        if padre_id is not None:
            return super().list(request, *args, **kwargs)

        empresa = request.user.empresa
        if not empresa and request.user.rol != "ADMIN":
            return Response({"estrategico": [], "misional": [], "apoyo": []})

        qs = self.get_queryset().filter(padre__isnull=True, activo=True).prefetch_related("subprocesos")
        serializer = self.get_serializer(qs, many=True)

        data = {
            "estrategico": [],
            "misional": [],
            "apoyo": [],
        }
        for item in serializer.data:
            tipo = item.get("tipo", "estrategico")
            if tipo in data:
                data[tipo].append(item)
            else:
                data["estrategico"].append(item)
        return Response(data)

    @action(detail=False, methods=["post"], url_path="sugerir-ia")
    def sugerir_ia(self, request):
        from rest_framework.response import Response
        from apps.empresas.services_ia import IAContextoService
        
        empresa = request.user.empresa
        if not empresa:
            return Response(
                {"message": "Identificador de empresa no provisto."},
                status=400
            )

        result = IAContextoService.sugerir_procesos(
            nombre=empresa.nombre,
            sector=empresa.sector_economico or "",
            ciiu_codigo=empresa.ciiu_codigo or "",
            ciiu_desc=empresa.ciiu_descripcion or "",
        )
        return Response(result)

