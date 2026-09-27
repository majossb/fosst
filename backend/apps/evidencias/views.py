import os
from datetime import datetime

from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.estandares.models import Evaluacion, Respuesta
from .models import Archivo, Evidencia
from .serializers import EvidenciaSerializer


class EvidenciaListCreateView(APIView):
    """
    GET  /api/evidencias       → lista evidencias del año actual.
    POST /api/evidencias       → crea evidencia con archivo (upload o URL).
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        anio_actual = datetime.now().year

        try:
            evaluacion = Evaluacion.objects.get(empresa=empresa, anio=anio_actual)
        except Evaluacion.DoesNotExist:
            return Response({"evidencias": [], "total": 0})

        respuestas = Respuesta.objects.filter(
            evaluacion=evaluacion
        ).select_related("estandar").prefetch_related("evidencias__archivo")

        evidencias = []
        for resp in respuestas:
            for ev in resp.evidencias.all():
                evidencias.append({
                    "id": ev.id,
                    "descripcion": ev.descripcion,
                    "created_at": ev.created_at,
                    "estandar_codigo": resp.estandar.codigo,
                    "estandar_nombre": resp.estandar.nombre,
                    "respuesta_id": resp.id,
                    "estado_estandar": resp.estado,
                    "archivo": {
                        "id": ev.archivo.id,
                        "nombre": ev.archivo.nombre,
                        "url": ev.archivo.url,
                        "tipo_mime": ev.archivo.tipo_mime,
                        "tamanio_kb": ev.archivo.tamanio_kb,
                    } if ev.archivo else None,
                    "fecha_ocurrencia": ev.fecha_ocurrencia,
                    "responsable": ev.responsable,
                    "firma": ev.firma,
                })

        return Response({
            "evidencias": evidencias,
            "total": len(evidencias),
            "evaluacion_id": evaluacion.id,
        })

    def post(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        respuesta_id = request.data.get("respuesta_id")
        nombre = request.data.get("nombre", "")
        descripcion = request.data.get("descripcion", "")
        url = request.data.get("url", "")
        tipo_mime = request.data.get("tipo_mime", "application/pdf")
        tamanio_kb = request.data.get("tamanio_kb", 0)
        fecha_ocurrencia = request.data.get("fecha_ocurrencia")
        responsable = request.data.get("responsable")
        firma = request.data.get("firma")

        # Verificar que la respuesta pertenece a una evaluación de esta empresa
        try:
            respuesta = Respuesta.objects.select_related("evaluacion").get(id=respuesta_id)
        except Respuesta.DoesNotExist:
            return Response({"message": "Respuesta no encontrada."}, status=404)

        if respuesta.evaluacion.empresa_id != empresa.id:
            return Response({"message": "No tiene permisos sobre esta respuesta."}, status=403)

        # Manejar archivo subido o URL
        uploaded_file = request.FILES.get("archivo")
        if uploaded_file:
            # Guardar archivo localmente
            upload_dir = os.path.join("uploads", "evidencias")
            os.makedirs(upload_dir, exist_ok=True)
            filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uploaded_file.name}"
            filepath = os.path.join(upload_dir, filename)

            with open(filepath, "wb+") as dest:
                for chunk in uploaded_file.chunks():
                    dest.write(chunk)

            final_url = f"/uploads/evidencias/{filename}"
            final_mime = uploaded_file.content_type
            final_size = round(uploaded_file.size / 1024)
        else:
            final_url = url
            final_mime = tipo_mime
            final_size = int(tamanio_kb) if tamanio_kb else 0

        # Crear archivo y evidencia
        archivo = Archivo.objects.create(
            nombre=nombre or "archivo",
            url=final_url,
            tipo_mime=final_mime,
            tamanio_kb=final_size,
            subido_por=str(request.user.id),
        )

        evidencia = Evidencia.objects.create(
            respuesta=respuesta,
            archivo=archivo,
            descripcion=descripcion,
            fecha_ocurrencia=fecha_ocurrencia,
            responsable=responsable,
            firma=firma,
        )

        serializer = EvidenciaSerializer(evidencia)
        return Response(serializer.data, status=201)


class EvidenciaDeleteView(APIView):
    """DELETE /api/evidencias/<id> → elimina evidencia verificando pertenencia."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, evidencia_id):
        empresa = request.user.empresa
        if not empresa:
            return Response({"message": "Sin empresa asociada."}, status=400)

        try:
            evidencia = Evidencia.objects.select_related(
                "respuesta__evaluacion"
            ).get(id=evidencia_id)
        except Evidencia.DoesNotExist:
            return Response({"message": "Evidencia no encontrada."}, status=404)

        if evidencia.respuesta.evaluacion.empresa_id != empresa.id:
            return Response({"message": "No tiene permisos para eliminar esta evidencia."}, status=403)

        evidencia.delete()
        return Response({"message": "Evidencia eliminada."})
