import uuid
from django.db import models


class Informe(models.Model):
    class Tipo(models.TextChoices):
        AUDITORIA = "auditoria", "Auditoría"
        REVISION_ALTA_DIRECCION = "revision_alta_direccion", "Revisión por la alta dirección"
        EJECUTIVO = "ejecutivo", "Ejecutivo"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    evaluacion = models.ForeignKey("estandares.Evaluacion", on_delete=models.CASCADE, related_name="informes")
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    contenido_json = models.JSONField(null=True, blank=True)
    fecha_elaboracion = models.DateTimeField(auto_now_add=True)
    firmado_responsable = models.BooleanField(default=False)
    firmado_direccion = models.BooleanField(default=False)
    archivo = models.ForeignKey(
        "evidencias.Archivo", on_delete=models.SET_NULL, null=True, blank=True, related_name="informes"
    )
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "informes"
