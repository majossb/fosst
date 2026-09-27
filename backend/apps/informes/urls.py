from django.urls import path
from .views import (
    InformeListView,
    InformeGenerarView,
    InformeDetalleView,
    InformeFirmarView,
    InformeDescargarPDFView
)

urlpatterns = [
    path("informes/", InformeListView.as_view(), name="informe-list"),
    path("informes/generar", InformeGenerarView.as_view(), name="informe-generar"),
    path("informes/<uuid:informe_id>", InformeDetalleView.as_view(), name="informe-detalle"),
    path("informes/<uuid:informe_id>/firmar", InformeFirmarView.as_view(), name="informe-firmar"),
    path("informes/<uuid:informe_id>/descargar-pdf", InformeDescargarPDFView.as_view(), name="informe-descargar-pdf"),
]
