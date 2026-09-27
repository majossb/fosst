from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    NovedadLaboralViewSet,
    ExamenMedicoOcupacionalViewSet,
    LicenciaConduccionViewSet,
    ExpedienteTrabajadorViewSet,
)

router = DefaultRouter()
router.register("novedades", NovedadLaboralViewSet, basename="novedad-laboral")
router.register("examenes-medicos", ExamenMedicoOcupacionalViewSet, basename="examen-medico")
router.register("licencias", LicenciaConduccionViewSet, basename="licencia-conduccion")
router.register("expediente", ExpedienteTrabajadorViewSet, basename="expediente-trabajador")

urlpatterns = [
    path("", include(router.urls)),
]
