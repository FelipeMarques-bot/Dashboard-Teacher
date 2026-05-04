from rest_framework import serializers

from .models import (
    AcademicCalendar,
    Assessment,
    CalendarEvent,
    ClassGroup,
    Grade,
    ScheduledLesson,
    School,
    SchoolShiftConfig,
    Student,
    Subject,
    WeeklyClassSlot,
)
from .services import calculate_notification_date


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = "__all__"


class SchoolShiftConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolShiftConfig
        fields = "__all__"


class ClassGroupSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    students_count = serializers.SerializerMethodField()

    def get_students_count(self, obj):
        return obj.students.count()

    class Meta:
        model = ClassGroup
        fields = [
            "id",
            "school",
            "school_name",
            "name",
            "grade_level",
            "shift",
            "students_count",
        ]


class StudentSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    class_group_name = serializers.CharField(source="class_group.name", read_only=True)
    class_group_shift = serializers.CharField(source="class_group.shift", read_only=True)

    class Meta:
        model = Student
        fields = [
            "id",
            "school",
            "school_name",
            "class_group",
            "class_group_name",
            "class_group_shift",
            "full_name",
            "enrollment_code",
        ]


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = "__all__"


class WeeklyClassSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyClassSlot
        fields = "__all__"


class AcademicCalendarSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicCalendar
        fields = "__all__"


class CalendarEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarEvent
        fields = "__all__"


class ScheduledLessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledLesson
        fields = "__all__"


class AssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assessment
        fields = "__all__"

    def create(self, validated_data):
        assessment = super().create(validated_data)
        self._compute_notification_date(assessment)
        return assessment

    def update(self, instance, validated_data):
        assessment = super().update(instance, validated_data)
        self._compute_notification_date(assessment)
        return assessment

    @staticmethod
    def _compute_notification_date(assessment: Assessment) -> None:
        school = assessment.class_group.school
        lead_days = assessment.notification_lead_days or school.assessment_default_lead_days
        assessment.notification_date = calculate_notification_date(
            school=school,
            class_group=assessment.class_group,
            assessment_date=assessment.scheduled_date,
            lead_days=lead_days,
        )
        assessment.save(update_fields=["notification_date"])


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Grade
        fields = "__all__"


class EnrollmentImportUploadSerializer(serializers.Serializer):
    files = serializers.ListField(
        child=serializers.FileField(),
        allow_empty=False,
        help_text="Lista de arquivos .csv, .xlsx ou .pdf para importacao de escolas/turmas/alunos.",
    )
