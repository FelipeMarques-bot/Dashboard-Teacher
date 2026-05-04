from django.utils import timezone

from config.celery import app

from .models import Assessment, DeviceToken


def _send_push_notification(token: str, title: str, body: str) -> None:
    # Aqui entra a chamada ao Firebase Cloud Messaging em producao.
    print(f"[FCM] token={token} title={title} body={body}")


@app.task(name="apps.school.tasks.send_due_assessment_notifications")
def send_due_assessment_notifications() -> int:
    today = timezone.localdate()
    assessments = Assessment.objects.select_related("teacher", "class_group").filter(
        notification_date=today,
        notification_sent_at__isnull=True,
    )

    sent = 0
    for assessment in assessments:
        if not assessment.teacher:
            continue

        tokens = DeviceToken.objects.filter(teacher=assessment.teacher, active=True).values_list("token", flat=True)
        for token in tokens:
            _send_push_notification(
                token,
                title="Lembrete de avaliacao",
                body=f"{assessment.title} em {assessment.scheduled_date.isoformat()} para {assessment.class_group.name}",
            )

        assessment.notification_sent_at = timezone.now()
        assessment.save(update_fields=["notification_sent_at"])
        sent += 1

    return sent
