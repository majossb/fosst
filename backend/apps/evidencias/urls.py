from django.urls import path
from .views import EvidenciaListCreateView, EvidenciaDeleteView

urlpatterns = [
    path("evidencias/", EvidenciaListCreateView.as_view(), name="evidencia-list-create"),
    path("evidencias/<uuid:evidencia_id>", EvidenciaDeleteView.as_view(), name="evidencia-delete"),
]
