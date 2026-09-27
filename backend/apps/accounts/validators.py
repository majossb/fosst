import re
from django.core.exceptions import ValidationError


class ComplejidadPasswordValidator:
    """Exige mayúscula, minúscula, número y símbolo — refuerzo de seguridad
    respecto a la validación mínima que tenía el backend en Express."""

    def validate(self, password, user=None):
        errores = []
        if not re.search(r"[A-Z]", password):
            errores.append("Debe contener al menos una letra mayúscula.")
        if not re.search(r"[a-z]", password):
            errores.append("Debe contener al menos una letra minúscula.")
        if not re.search(r"\d", password):
            errores.append("Debe contener al menos un número.")
        if not re.search(r"[^\w\s]", password):
            errores.append("Debe contener al menos un símbolo especial.")
        if errores:
            raise ValidationError(errores)

    def get_help_text(self):
        return "La contraseña debe incluir mayúsculas, minúsculas, números y símbolos."
