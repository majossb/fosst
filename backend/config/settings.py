
import os
from datetime import timedelta
from pathlib import Path
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Terceros
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "axes",
    "django_filters",
    "drf_spectacular",
    "storages",

    # Apps propias
    "apps.accounts",
    "apps.empresas",
    "apps.auditoria",
    "apps.seguridad",
    "apps.planes",
    "apps.organizacion",
    "apps.estandares",
    "apps.evidencias",
    "apps.informes",
    "apps.hallazgos",
    "apps.capacitaciones",
    "apps.calendario",
    "apps.perfilcargo",
    "apps.dashboard",

    # Fase 2 — Servicio IA genérico + HBSEO
    "apps.ia",
    "apps.hbseo",

    # Fase 3 — Gestión Humana y Motor de Alertas
    "apps.gestion_humana",
    "apps.alertas",

    # Fase 4 — MICHC (Matriz Inteligente de Cumplimiento)
    "apps.michc",

    # Fase 5 — Formación y Desarrollo (MCC)
    "apps.formacion",

    # Módulo 2.1 — Reclutamiento y Selección (FOSST V.I.D.A.)
    "apps.reclutamiento",
]

AUTH_USER_MODEL = "accounts.Usuario"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",                     # bloqueo por intentos fallidos
    "apps.auditoria.middleware.AuditoriaMiddleware",       # registra actividad de cada request
    "apps.seguridad.middleware.DispositivoMiddleware",     # historial de dispositivos / IP
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],  # plantillas de email (activación, OTP, reset)
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ── Base de datos (PostgreSQL única fuente de verdad) ─────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/fosst_db")
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=600)

# ── Almacenamiento de objetos (S3 / MinIO via django-storages) ─────────────
STORAGES = {
    "default": {
        "BACKEND": env("STORAGE_BACKEND", default="storages.backends.s3.S3Storage"),
        "OPTIONS": {
            "access_key": env("AWS_ACCESS_KEY_ID", default="minioadmin"),
            "secret_key": env("AWS_SECRET_ACCESS_KEY", default="minioadmin"),
            "bucket_name": env("AWS_STORAGE_BUCKET_NAME", default="fosst-media"),
            "endpoint_url": env("AWS_S3_ENDPOINT_URL", default="http://localhost:9000"),
            "region_name": env("AWS_S3_REGION_NAME", default="us-east-1"),
            "file_overwrite": False,
        }
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

MAX_UPLOAD_SIZE_MB = env.int("MAX_UPLOAD_SIZE_MB", default=20)
ALLOWED_UPLOAD_MIME_TYPES = env.list(
    "ALLOWED_UPLOAD_MIME_TYPES",
    default=[
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
    ]
)

# ── Password hashing (Argon2 primero, más robusto que bcrypt) ─────────────
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "apps.accounts.validators.ComplejidadPasswordValidator"},  # mayúsc/minúsc/número/símbolo
]

LANGUAGE_CODE = "es-co"
TIME_ZONE = "America/Bogota"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── CORS ────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"])
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type",
    "dnt", "origin", "user-agent", "x-requested-with",
]

# ── Seguridad HTTP (cabeceras y cookies) ───────────────────────────────
SECURE_BROWSER_XSS_FILTER = True             # X-XSS-Protection: 1; mode=block
SECURE_CONTENT_TYPE_NOSNIFF = True            # X-Content-Type-Options: nosniff
X_FRAME_OPTIONS = "DENY"                     # Clickjacking: rechaza iframe por terceros
SESSION_COOKIE_HTTPONLY = True                # Previene acceso a cookies via JS
CSRF_COOKIE_HTTPONLY = True                   # CSRF cookie solo por HTTP
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
# HSTS: en producción se recomienda activar con:
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True
# SECURE_SSL_REDIRECT = True  (solo si hay HTTPS)

# ── Django REST Framework ──────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    # Rate limiting global + por endpoint sensible
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",          # No autenticados: 60 req/min (protege login brute-force)
        "user": "200/min",         # Autenticados: 200 req/min (burst cap)
        "login": "10/min",
        "otp": "5/min",
        "password_reset": "5/hour",
        "register": "5/hour",
        "michc_recalcular": "20/min",  # Recálculo manual de MICHC
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    # Renderización: solo JSON en producción (previene HTML debug info leak)
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
}

# ── JWT (equivalente al jsonwebtoken de Express, pero con refresh + rotación) ──
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("JWT_SECRET", default="fosst-jwt-secret-key-default-2026"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "sub",
}

# ── django-axes: bloqueo por intentos fallidos (usuario + IP) ─────────────
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",   # debe ir primero
    "django.contrib.auth.backends.ModelBackend",
]
AXES_FAILURE_LIMIT = 5                 # intentos antes de bloquear
AXES_COOLOFF_TIME = timedelta(minutes=30)   # tiempo de bloqueo temporal
AXES_LOCKOUT_PARAMETERS = ["username", "ip_address"]   # bloquea por usuario Y por IP
AXES_RESET_ON_SUCCESS = True

# ── Email (Resend API) ────────────────────────────────────────────────────
RESEND_API_KEY = env("RESEND_API_KEY", default="")

EMAIL_FROM = env(
    "EMAIL_FROM",
    default="DiagnostISST <onboarding@resend.dev>",
)

FRONTEND_URL = env(
    "FRONTEND_URL",
    default="http://localhost:5173",
)

# ── Parámetros propios del módulo de autenticación ────────────────────────
OTP_EXPIRATION_MINUTES = 5
ACTIVATION_TOKEN_EXPIRATION_HOURS = 48
PASSWORD_RESET_TOKEN_EXPIRATION_HOURS = 1

# ── Cache (redis en prod/dev, LocMemCache en testing) ──────────────────────
import sys
TESTING = 'test' in sys.argv if sys.argv else False

if TESTING:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "test-cache",
        }
    }
    CELERY_TASK_ALWAYS_EAGER = True
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/1"),
        }
    }

# Celery
CELERY_BROKER_URL = env(
    "REDIS_URL",
    default="redis://127.0.0.1:6379/1"
)

CELERY_RESULT_BACKEND = env(
    "REDIS_URL",
    default="redis://127.0.0.1:6379/1"
)

CELERY_ACCEPT_CONTENT = ["json"]

CELERY_TASK_SERIALIZER = "json"

CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = "America/Bogota"

# Celery Beat — Programación de tareas periódicas (§5.2)
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    "revisar-vencimientos-diario": {
        "task": "apps.alertas.tasks.revisar_vencimientos",
        "schedule": crontab(hour=6, minute=0),  # 6:00 AM America/Bogota
    },
}

# ANTHROPIC SDK API KEY
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")