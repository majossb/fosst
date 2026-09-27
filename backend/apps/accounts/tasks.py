import resend
from celery import shared_task
from django.conf import settings

resend.api_key = settings.RESEND_API_KEY


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def enviar_email_task(self, subject, body, destinatario):
    return resend.Emails.send({
        "from": settings.EMAIL_FROM,
        "to": [destinatario],
        "subject": subject,
        "text": body,
    })