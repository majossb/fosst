from django.urls import path
from .views import InformeListView, InformeGenerarView, InformeDetalleView

urlpatterns = [
    path("informes/", InformeListView.as_view(), name="informe-list"),
    path("informes/generar", InformeGenerarView.as_view(), name="informe-generar"),
    path("informes/<uuid:informe_id>", InformeDetalleView.as_view(), name="informe-detalle"),
]
