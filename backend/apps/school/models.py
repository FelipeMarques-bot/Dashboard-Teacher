from django.conf import settings
from django.db import models


class Weekday(models.IntegerChoices):
    MONDAY = 0, "Segunda"
    TUESDAY = 1, "Terca"
    WEDNESDAY = 2, "Quarta"
    THURSDAY = 3, "Quinta"
    FRIDAY = 4, "Sexta"
    SATURDAY = 5, "Sabado"
    SUNDAY = 6, "Domingo"


class EventType(models.TextChoices):
    NATIONAL_HOLIDAY = "national_holiday", "Feriado nacional"
    STATE_HOLIDAY = "state_holiday", "Feriado estadual"
    MUNICIPAL_HOLIDAY = "municipal_holiday", "Feriado municipal"
    PEDAGOGICAL_STOP = "pedagogical_stop", "Parada pedagogica"
    INTERNAL_EVENT = "internal_event", "Evento interno"


class EventScope(models.TextChoices):
    SCHOOL = "school", "Escola"
    CLASS_GROUP = "class_group", "Turma"


class ShiftType(models.TextChoices):
    MORNING = "morning", "Manha"
    AFTERNOON = "afternoon", "Tarde"
    EVENING = "evening", "Noite"


class School(models.Model):
    name = models.CharField(max_length=180)
    city = models.CharField(max_length=120)
    state = models.CharField(max_length=2)
    timezone = models.CharField(max_length=80, default="America/Sao_Paulo")
    assessment_default_lead_days = models.PositiveSmallIntegerField(default=2)

    def __str__(self) -> str:
        return self.name


class Teacher(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="teacher_profile")
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="teachers")

    def __str__(self) -> str:
        return self.user.get_full_name() or self.user.username


class Subject(models.Model):
    name = models.CharField(max_length=120)
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="subjects")
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name="subjects")

    class Meta:
        unique_together = ("name", "school")

    def __str__(self) -> str:
        return self.name


class SchoolShiftConfig(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="shift_configs")
    weekday = models.IntegerField(choices=Weekday.choices)
    shift = models.CharField(max_length=16, choices=ShiftType.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    class_duration_minutes = models.PositiveSmallIntegerField(default=50)
    class_count = models.PositiveSmallIntegerField(default=5)

    class Meta:
        unique_together = ("school", "weekday", "shift")


class ClassGroup(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="class_groups")
    name = models.CharField(max_length=60)
    grade_level = models.CharField(max_length=30)
    shift = models.CharField(max_length=16, choices=ShiftType.choices)

    class Meta:
        unique_together = ("school", "name")

    def __str__(self) -> str:
        return f"{self.name} ({self.school.name})"


class Student(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="students")
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="students")
    full_name = models.CharField(max_length=180)
    enrollment_code = models.CharField(max_length=60)

    class Meta:
        unique_together = ("school", "enrollment_code")

    def __str__(self) -> str:
        return self.full_name


class WeeklyClassSlot(models.Model):
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="weekly_slots")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="weekly_slots")
    weekday = models.IntegerField(choices=Weekday.choices)
    slot_order = models.PositiveSmallIntegerField(help_text="Posicao da aula no dia")
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name="weekly_slots")

    class Meta:
        unique_together = ("class_group", "weekday", "slot_order")
        ordering = ["class_group", "weekday", "slot_order"]


class AcademicCalendar(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name="academic_calendars")
    year = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()

    class Meta:
        unique_together = ("school", "year")

    def __str__(self) -> str:
        return f"Calendario {self.year} - {self.school.name}"


class CalendarEvent(models.Model):
    calendar = models.ForeignKey(AcademicCalendar, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    scope = models.CharField(max_length=16, choices=EventScope.choices, default=EventScope.SCHOOL)
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, null=True, blank=True, related_name="events")
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    date = models.DateField()
    city = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=2, blank=True)
    is_recurring = models.BooleanField(default=False)

    class Meta:
        ordering = ["date", "title"]


class ScheduledLesson(models.Model):
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="scheduled_lessons")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="scheduled_lessons")
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name="scheduled_lessons")
    date = models.DateField()
    slot_order = models.PositiveSmallIntegerField()
    content_plan = models.CharField(max_length=240)

    class Meta:
        unique_together = ("class_group", "date", "slot_order")
        ordering = ["date", "slot_order"]


class Assessment(models.Model):
    class_group = models.ForeignKey(ClassGroup, on_delete=models.CASCADE, related_name="assessments")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="assessments")
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name="assessments")
    title = models.CharField(max_length=180)
    scheduled_date = models.DateField()
    notification_lead_days = models.PositiveSmallIntegerField(default=2)
    notification_date = models.DateField(null=True, blank=True)
    notification_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["scheduled_date", "title"]


class Grade(models.Model):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="grades")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="grades")
    value = models.DecimalField(max_digits=5, decimal_places=2)
    notes = models.CharField(max_length=180, blank=True)

    class Meta:
        unique_together = ("assessment", "student")


class DeviceToken(models.Model):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="device_tokens")
    token = models.CharField(max_length=240, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)


class NationalHolidayCache(models.Model):
    year = models.PositiveSmallIntegerField(unique=True)
    raw_payload = models.JSONField(default=list)
    fetched_at = models.DateTimeField(auto_now=True)
