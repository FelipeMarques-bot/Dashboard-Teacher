from datetime import date
from os import getenv
from urllib.parse import urlencode

from django.db.models import Avg
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    AcademicCalendar,
    Assessment,
    CalendarEvent,
    ClassGroup,
    EventType,
    Grade,
    ScheduledLesson,
    School,
    SchoolShiftConfig,
    Student,
    Subject,
    WeeklyClassSlot,
)
from .serializers import (
    AcademicCalendarSerializer,
    AssessmentSerializer,
    CalendarEventSerializer,
    ClassGroupSerializer,
    EnrollmentImportUploadSerializer,
    GradeSerializer,
    ScheduledLessonSerializer,
    SchoolSerializer,
    SchoolShiftConfigSerializer,
    StudentSerializer,
    SubjectSerializer,
    WeeklyClassSlotSerializer,
)
from .services import consolidated_calendar_days, sync_national_holidays
from .services import country_dates, import_class_groups, import_enrollments, import_schools, import_students


class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated]


class ClassGroupViewSet(viewsets.ModelViewSet):
    queryset = ClassGroup.objects.select_related("school").all()
    serializer_class = ClassGroupSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "shift"]


class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.select_related("school", "class_group").all()
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "class_group"]
    search_fields = ["full_name", "enrollment_code"]


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.select_related("school", "teacher").all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "teacher"]


class ShiftConfigViewSet(viewsets.ModelViewSet):
    queryset = SchoolShiftConfig.objects.select_related("school").all()
    serializer_class = SchoolShiftConfigSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "weekday", "shift"]


class WeeklyClassSlotViewSet(viewsets.ModelViewSet):
    queryset = WeeklyClassSlot.objects.select_related("class_group", "subject", "teacher").all()
    serializer_class = WeeklyClassSlotSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["class_group", "subject", "weekday"]


class AcademicCalendarViewSet(viewsets.ModelViewSet):
    queryset = AcademicCalendar.objects.select_related("school").all()
    serializer_class = AcademicCalendarSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["school", "year"]

    @action(detail=True, methods=["post"])
    def sync_national_holidays(self, request, pk=None):
        calendar = self.get_object()
        created = sync_national_holidays(calendar)
        return Response({"created": created})


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.select_related("calendar", "class_group").all()
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["calendar", "event_type", "scope", "class_group", "date"]


class ScheduledLessonViewSet(viewsets.ModelViewSet):
    queryset = ScheduledLesson.objects.select_related("class_group", "subject", "teacher").all()
    serializer_class = ScheduledLessonSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["class_group", "subject", "date"]


class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.select_related("class_group", "subject", "teacher").all()
    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["class_group", "subject", "scheduled_date"]


class GradeViewSet(viewsets.ModelViewSet):
    queryset = Grade.objects.select_related("assessment", "student").all()
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["assessment", "student"]


class ConsolidatedCalendarPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        school_id = request.query_params.get("school_id")
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        if not all([school_id, start, end]):
            return Response({"detail": "Parametros obrigatorios: school_id, start, end"}, status=400)

        school = School.objects.get(id=school_id)
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
        days = consolidated_calendar_days(school, start_date, end_date)
        events = CalendarEvent.objects.filter(
            calendar__school=school,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")

        return Response(
            {
                "school": school.name,
                "blocked_days": sorted(day.isoformat() for day in days),
                "events": CalendarEventSerializer(events, many=True).data,
            }
        )


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        upcoming_assessments = Assessment.objects.filter(
            scheduled_date__gte=timezone.localdate()
        ).count()
        average_grade = Grade.objects.aggregate(avg=Avg("value"))["avg"]

        return Response(
            {
                "schools": School.objects.count(),
                "class_groups": ClassGroup.objects.count(),
                "students": Student.objects.count(),
                "upcoming_assessments": upcoming_assessments,
                "average_grade": average_grade,
            }
        )


class EnrollmentImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EnrollmentImportUploadSerializer(data={"files": request.FILES.getlist("files")})
        serializer.is_valid(raise_exception=True)

        result = import_enrollments(serializer.validated_data["files"])
        return Response(result)


class SchoolImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EnrollmentImportUploadSerializer(data={"files": request.FILES.getlist("files")})
        serializer.is_valid(raise_exception=True)

        result = import_schools(serializer.validated_data["files"])
        return Response(result)


class ClassGroupImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EnrollmentImportUploadSerializer(data={"files": request.FILES.getlist("files")})
        serializer.is_valid(raise_exception=True)

        result = import_class_groups(serializer.validated_data["files"])
        return Response(result)


class StudentImportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = EnrollmentImportUploadSerializer(data={"files": request.FILES.getlist("files")})
        serializer.is_valid(raise_exception=True)

        result = import_students(serializer.validated_data["files"])
        return Response(result)


class GoogleIntegrationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        credentials_path = getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
        has_credentials = bool(credentials_path)

        drive_connected = getenv("GOOGLE_DRIVE_ENABLED", "false").lower() == "true" and has_credentials
        calendar_connected = getenv("GOOGLE_CALENDAR_ENABLED", "false").lower() == "true" and has_credentials
        classroom_connected = getenv("GOOGLE_CLASSROOM_ENABLED", "false").lower() == "true" and has_credentials

        return Response(
            {
                "credentials_configured": has_credentials,
                "credentials_path": credentials_path,
                "drive": {
                    "connected": drive_connected,
                    "message": "Conectado" if drive_connected else "Nao conectado. Configure GOOGLE_DRIVE_ENABLED=true e credenciais.",
                },
                "calendar": {
                    "connected": calendar_connected,
                    "message": "Conectado" if calendar_connected else "Nao conectado. Configure GOOGLE_CALENDAR_ENABLED=true e credenciais.",
                },
                "classroom": {
                    "connected": classroom_connected,
                    "message": "Conectado" if classroom_connected else "Nao conectado. Configure GOOGLE_CLASSROOM_ENABLED=true e credenciais.",
                },
            }
        )


class GoogleIntegrationConnectUrlView(APIView):
    permission_classes = [IsAuthenticated]

    GOOGLE_OAUTH_BASE_URL = "https://accounts.google.com/o/oauth2/v2/auth"

    SERVICE_SCOPES = {
        "drive": ["https://www.googleapis.com/auth/drive.file"],
        "calendar": ["https://www.googleapis.com/auth/calendar.events"],
        "classroom": ["https://www.googleapis.com/auth/classroom.courses.readonly"],
    }

    def get(self, request):
        service = (request.query_params.get("service") or "").strip().lower()
        if service not in self.SERVICE_SCOPES:
            return Response({"detail": "Servico invalido. Use: drive, calendar ou classroom."}, status=400)

        client_id = getenv("GOOGLE_OAUTH_CLIENT_ID", "").strip()
        redirect_uri = getenv("GOOGLE_OAUTH_REDIRECT_URI", "").strip()
        if not client_id or not redirect_uri:
            return Response(
                {
                    "detail": "Google OAuth nao configurado. Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_REDIRECT_URI.",
                },
                status=400,
            )

        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "access_type": "offline",
            "include_granted_scopes": "true",
            "prompt": "consent",
            "scope": " ".join(self.SERVICE_SCOPES[service]),
            "state": f"service:{service}|user:{request.user.id}",
        }
        connect_url = f"{self.GOOGLE_OAUTH_BASE_URL}?{urlencode(params)}"

        return Response({"service": service, "connect_url": connect_url})


class CountryDatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = request.query_params.get("year")
        if not year:
            year_value = timezone.localdate().year
        else:
            try:
                year_value = int(year)
            except ValueError:
                return Response({"detail": "Parametro year invalido."}, status=400)

        return Response({"year": year_value, "dates": country_dates(year_value)})


class SyncCountryDatesToCalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, calendar_id: int):
        try:
            calendar = AcademicCalendar.objects.get(id=calendar_id)
        except AcademicCalendar.DoesNotExist:
            return Response({"detail": "Calendario nao encontrado."}, status=404)

        year = request.data.get("year") or calendar.year
        try:
            year_value = int(year)
        except (TypeError, ValueError):
            return Response({"detail": "Ano invalido."}, status=400)

        created = 0
        for item in country_dates(year_value):
            event_date = parse_date(item.get("date", ""))
            if not event_date:
                continue

            event_type = EventType.NATIONAL_HOLIDAY if item.get("type") == "national_holiday" else EventType.INTERNAL_EVENT
            _, was_created = CalendarEvent.objects.get_or_create(
                calendar=calendar,
                event_type=event_type,
                title=item.get("name", "Data nacional"),
                date=event_date,
                defaults={"description": f"Sincronizado via {item.get('source', 'country_api')}"},
            )
            if was_created:
                created += 1

        return Response({"created": created, "calendar": calendar.id, "year": year_value})
