from rest_framework import serializers
from apps.planes.models import Plan, Suscripcion
from apps.accounts.models import Usuario
from .models import Empresa, AuditorEmpresa, SolicitudEliminacion


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = "__all__"


class SuscripcionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)

    class Meta:
        model = Suscripcion
        fields = "__all__"


class EmpresaSerializer(serializers.ModelSerializer):
    suscripciones = serializers.SerializerMethodField()
    _count = serializers.SerializerMethodField()

    class Meta:
        model = Empresa
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at"]

    def get_suscripciones(self, obj):
        active_subs = obj.suscripciones.filter(estado="activa")[:1]
        return SuscripcionSerializer(active_subs, many=True).data

    def get__count(self, obj):
        # Conteo de sedes activas, procesos activos y organigrama activo
        return {
            "sedes": obj.sedes.filter(activa=True).count(),
            "procesos": obj.procesos.filter(activo=True).count(),
            "organigrama": obj.organigrama.filter(activo=True).count(),
        }


class RegistroEmpresaSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=255)
    nit = serializers.CharField(max_length=30)
    num_trabajadores = serializers.IntegerField(min_value=1)
    nivel_riesgo = serializers.IntegerField(min_value=1, max_value=5)
    representante_legal = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    arl = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    sector_economico = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    ciudad = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    ciiu_codigo = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    ciiu_descripcion = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    responsable_nombre = serializers.CharField(max_length=255)
    responsable_documento = serializers.CharField(max_length=30)
    responsable_email = serializers.EmailField()
    responsable_password = serializers.CharField(write_only=True)

    def validate_nit(self, value):
        if Empresa.objects.filter(nit=value).exists():
            raise serializers.ValidationError("Ya existe una empresa con ese NIT.")
        return value

    def validate_responsable_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese correo.")
        return value
