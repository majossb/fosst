"""
Signals para Gestión Humana.

- NovedadLaboral post_save / post_delete:
  Dispara el recálculo determinista de estado_contractual en el Trabajador
  usando la jerarquía de precedencia.
"""
import logging
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import NovedadLaboral
from .services import recalcular_estado_contractual

logger = logging.getLogger(__name__)


@receiver(post_save, sender=NovedadLaboral)
def on_novedad_laboral_saved(sender, instance, created, **kwargs):
    """Recalcula estado contractual del trabajador al crear o modificar una novedad."""
    trabajador = instance.trabajador
    transaction.on_commit(
        lambda: recalcular_estado_contractual(trabajador)
    )


@receiver(post_delete, sender=NovedadLaboral)
def on_novedad_laboral_deleted(sender, instance, **kwargs):
    """Recalcula estado contractual del trabajador al eliminar una novedad."""
    trabajador = instance.trabajador
    transaction.on_commit(
        lambda: recalcular_estado_contractual(trabajador)
    )
