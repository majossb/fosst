#!/usr/bin/env python
"""
Script autónomo para ejecutar el reset transaccional del ambiente UAT.
Uso: python scripts/reset_uat.py --confirm
"""

import os
import sys
from pathlib import Path

# Agregar el directorio backend al sys.path
BASE_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

try:
    import django
    django.setup()
    from django.core.management import call_command
except Exception as e:
    print(f"Error inicializando Django para reset_uat: {e}")
    sys.exit(1)


if __name__ == "__main__":
    confirm = "--confirm" in sys.argv
    try:
        call_command("reset_uat", confirm=confirm)
    except Exception as exc:
        print(f"Error ejecutando reset_uat: {exc}")
        sys.exit(1)
