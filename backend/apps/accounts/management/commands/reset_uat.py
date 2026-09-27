"""
Comando administrativo para reiniciar únicamente los datos transaccionales del ambiente UAT.
Garantiza que la base de datos quede limpia para la clienta (0 empresas, 0 usuarios cliente),
preservando la estructura de la BD, las migraciones y todos los catálogos normativos (Res. 0312, GTC 45, EPP, Reglas Alerta).
"""

from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
from django.conf import settings
from django.db import transaction

from apps.accounts.models import Usuario
from apps.empresas.models import Empresa
from apps.estandares.models import Evaluacion, Respuesta, Apelacion, Estandar
from apps.hallazgos.models import Hallazgo
from apps.informes.models import Informe
from apps.evidencias.models import Evidencia
from apps.organizacion.models import Sede, Proceso, NodoOrganigrama
from apps.capacitaciones.models import Trabajador
from apps.perfilcargo.models import PerfilCargo, CatalogoPeligro, CatalogoEPP
from apps.perfilcargo.catalogo_seeder import seed_gtc45_and_epp_catalogs
from apps.planes.models import Plan, Suscripcion
from apps.calendario.models import Notificacion
from apps.alertas.models import ReglaAlerta
from apps.auditoria.models import AuditLog
from apps.seguridad.models import EventoRiesgo, DispositivoConocido


class Command(BaseCommand):
    help = "Limpia los datos transaccionales de UAT manteniendo intactos los catálogos y la estructura."

    def add_arguments(self, parser):
        parser.add_argument(
            "--confirm",
            action="store_true",
            help="Confirma explícitamente la ejecución del reset de UAT.",
        )

    def handle(self, *args, **options):
        environment = getattr(settings, "ENVIRONMENT", "development").lower()
        allow_reset = getattr(settings, "ALLOW_UAT_RESET", False) or options.get("confirm")

        self.stdout.write(self.style.WARNING("============================================================"))
        self.stdout.write(self.style.WARNING("ADVERTENCIA: esta operación eliminará los datos transaccionales del ambiente UAT."))
        self.stdout.write(self.style.WARNING("============================================================"))

        if environment not in ["uat", "development"]:
            raise CommandError(f"El comando reset_uat no puede ejecutarse en el ambiente actual ('{environment}'). Solo permitido en UAT o DEV con confirmación.")

        if not allow_reset:
            self.stdout.write(self.style.ERROR("Para ejecutar manualmente se requiere la opción --confirm o la variable ALLOW_UAT_RESET=true."))
            confirmacion = input("¿Está seguro de que desea eliminar los datos transaccionales de UAT? (escriba 'SI' para continuar): ")
            if confirmacion.strip().upper() != "SI":
                self.stdout.write(self.style.NOTICE("Operación cancelada por el usuario."))
                return

        self.stdout.write("Iniciando purga de datos transaccionales de UAT...")

        with transaction.atomic():
            # 1. Eliminar datos transaccionales de auditoría y evaluación
            Informe.objects.all().delete()
            Apelacion.objects.all().delete()
            Hallazgo.objects.all().delete()
            Evidencia.objects.all().delete()
            Respuesta.objects.all().delete()
            Evaluacion.objects.all().delete()

            # 2. Eliminar estructura organizacional y personal cliente
            try:
                from apps.gestion_humana.models import NovedadLaboral, ExamenMedicoOcupacional, LicenciaConduccion
                NovedadLaboral.objects.all().delete()
                ExamenMedicoOcupacional.objects.all().delete()
                LicenciaConduccion.objects.all().delete()
            except Exception:
                pass

            Trabajador.objects.all().delete()
            PerfilCargo.objects.all().delete()
            NodoOrganigrama.objects.all().delete()
            Proceso.objects.all().delete()
            Sede.objects.all().delete()

            # 3. Eliminar notificaciones, alertas y logs
            Notificacion.objects.all().delete()
            AuditLog.objects.all().delete()
            EventoRiesgo.objects.all().delete()
            DispositivoConocido.objects.all().delete()

            # 4. Eliminar suscripciones, usuarios y empresas cliente
            Suscripcion.objects.all().delete()
            Usuario.objects.all().delete()
            Empresa.objects.all().delete()

            # 5. Intentar purga de módulos opcionales si existen
            try:
                from apps.reclutamiento.models import Vacante, Postulacion
                Postulacion.objects.all().delete()
                Vacante.objects.all().delete()
            except Exception:
                pass

            try:
                from apps.formacion.models import PlanFormacion, RegistroCapacitacion
                RegistroCapacitacion.objects.all().delete()
                PlanFormacion.objects.all().delete()
            except Exception:
                pass

        self.stdout.write(self.style.SUCCESS("[OK] Datos transaccionales purgados exitosamente."))

        # 6. Re-sembrar catálogos de sistema obligatorios
        self.stdout.write("Sembrando catálogos del sistema (Res. 0312, GTC 45, EPP, Reglas Alerta, Planes)...")

        # Planes por defecto
        Plan.objects.get_or_create(
            nombre="Plan Pro Audit",
            defaults={
                "precio_mensual": 100000,
                "precio_anual": 1000000,
                "max_usuarios": 100,
                "max_evidencias_mb": 5000,
                "tiene_auditoria": True,
                "tiene_informes": True,
                "tiene_calendario": True,
                "tiene_alertas_email": True,
                "tiene_historico": True,
                "activo": True,
            }
        )

        call_command("seed_estandares")
        call_command("seed_reglas_alerta")
        seed_gtc45_and_epp_catalogs()

        # 7. Verificación final de integridad UAT
        num_empresas = Empresa.objects.count()
        num_usuarios = Usuario.objects.count()
        num_estandares = Estandar.objects.count()
        num_reglas = ReglaAlerta.objects.count()
        num_peligros = CatalogoPeligro.objects.count()

        self.stdout.write(self.style.SUCCESS("\n============================================================"))
        self.stdout.write(self.style.SUCCESS("ESTADO DEL AMBIENTE UAT TRAS RESET:"))
        self.stdout.write(f"  * Empresas cliente: {num_empresas}")
        self.stdout.write(f"  * Usuarios cliente: {num_usuarios}")
        self.stdout.write(f"  * Estándares Res. 0312 disponibles: {num_estandares}")
        self.stdout.write(f"  * Reglas de alerta disponibles: {num_reglas}")
        self.stdout.write(f"  * Peligros GTC 45 disponibles: {num_peligros}")
        self.stdout.write(self.style.SUCCESS("============================================================"))
        self.stdout.write(self.style.SUCCESS("[OK] El ambiente UAT está 100% listo para pruebas limpias de la clienta."))
