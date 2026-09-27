import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def enviar_email_task(
    self,
    subject=None,
    body=None,
    destinatario=None,
    asunto=None,
    cuerpo=None,
    html_body=None,
    html_message=None,
    html_cuerpo=None,
    from_email=None,
):
    """
    Tarea Celery asíncrona para envío de correos utilizando el backend SMTP nativo de Django.
    Soporta argumentos posicionales y nombrados (subject/asunto, body/cuerpo, destinatario).
    """
    email_subject = subject or asunto or ""
    email_body = body or cuerpo or ""
    email_html = html_body or html_message or html_cuerpo
    target_email = destinatario

    if not target_email:
        logger.warning("[enviar_email_task] Se intentó enviar un correo sin destinatario.")
        return {"status": "skipped", "reason": "no_recipient"}

    sender = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "DiagnostISST <no-reply@diagnostisst.com>")

    try:
        msg = EmailMultiAlternatives(
            subject=email_subject,
            body=email_body,
            from_email=sender,
            to=[target_email],
        )
        if email_html:
            msg.attach_alternative(email_html, "text/html")

        msg.send(fail_silently=False)
        logger.info("[enviar_email_task] Correo enviado exitosamente vía SMTP a %s (Asunto: %s)", target_email, email_subject)
        return {"status": "sent", "to": target_email, "subject": email_subject}
    except Exception as exc:
        logger.error("[enviar_email_task] Error al enviar correo SMTP a %s: %s", target_email, str(exc))
        raise self.retry(exc=exc)