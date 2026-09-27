from rest_framework import serializers
from .models import Estandar, Evaluacion, Respuesta, Apelacion


class EstandarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estandar
        fields = "__all__"


class RespuestaSerializer(serializers.ModelSerializer):
    estandar = EstandarSerializer(read_only=True)
    evidencias_count = serializers.SerializerMethodField()

    class Meta:
        model = Respuesta
        fields = "__all__"

    def get_evidencias_count(self, obj):
        # En la fase 4 agregaremos el modelo Evidencia. Por ahora retornamos el conteo si existe la relacion.
        if hasattr(obj, "evidencias"):
            return obj.evidencias.count()
        return 0


class EvaluacionSerializer(serializers.ModelSerializer):
    respuestas = RespuestaSerializer(many=True, read_only=True)

    class Meta:
        model = Evaluacion
        fields = "__all__"


class ApelacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Apelacion
        fields = "__all__"
