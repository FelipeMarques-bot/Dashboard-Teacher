from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .auth_views import GoogleLoginView, LoginView, MeView, RefreshTokenView, RegisterView

from .views import (
    AcademicCalendarViewSet,
    AssessmentViewSet,
    CalendarEventViewSet,
    ClassGroupViewSet,
    ConsolidatedCalendarPreviewView,
    CountryDatesView,
    DashboardMetricsView,
    ClassGroupImportView,
    EnrollmentImportView,
    GoogleIntegrationStatusView,
    GradeViewSet,
    ScheduledLessonViewSet,
    SchoolViewSet,
    ShiftConfigViewSet,
    SyncCountryDatesToCalendarView,
    StudentViewSet,
    StudentImportView,
    SchoolImportView,
    SubjectViewSet,
    WeeklyClassSlotViewSet,
)

router = DefaultRouter()
router.register(r"schools", SchoolViewSet)
router.register(r"class-groups", ClassGroupViewSet)
router.register(r"students", StudentViewSet)
router.register(r"subjects", SubjectViewSet)
router.register(r"shift-configs", ShiftConfigViewSet)
router.register(r"weekly-slots", WeeklyClassSlotViewSet)
router.register(r"academic-calendars", AcademicCalendarViewSet)
router.register(r"calendar-events", CalendarEventViewSet)
router.register(r"scheduled-lessons", ScheduledLessonViewSet)
router.register(r"assessments", AssessmentViewSet)
router.register(r"grades", GradeViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/google/", GoogleLoginView.as_view()),
    path("auth/refresh/", RefreshTokenView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("calendar/consolidated-preview/", ConsolidatedCalendarPreviewView.as_view()),
    path("calendar/country-dates/", CountryDatesView.as_view()),
    path("calendar/<int:calendar_id>/sync-country-dates/", SyncCountryDatesToCalendarView.as_view()),
    path("dashboard/metrics/", DashboardMetricsView.as_view()),
    path("import/enrollments/", EnrollmentImportView.as_view()),
    path("import/schools/", SchoolImportView.as_view()),
    path("import/class-groups/", ClassGroupImportView.as_view()),
    path("import/students/", StudentImportView.as_view()),
    path("integrations/google/status/", GoogleIntegrationStatusView.as_view()),
]
