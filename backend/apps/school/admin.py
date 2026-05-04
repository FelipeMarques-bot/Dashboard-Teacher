from django.contrib import admin

from .models import (
    AcademicCalendar,
    Assessment,
    CalendarEvent,
    ClassGroup,
    DeviceToken,
    Grade,
    NationalHolidayCache,
    ScheduledLesson,
    School,
    SchoolShiftConfig,
    Student,
    Subject,
    Teacher,
    WeeklyClassSlot,
)

admin.site.register(School)
admin.site.register(Teacher)
admin.site.register(Subject)
admin.site.register(SchoolShiftConfig)
admin.site.register(ClassGroup)
admin.site.register(Student)
admin.site.register(WeeklyClassSlot)
admin.site.register(AcademicCalendar)
admin.site.register(CalendarEvent)
admin.site.register(ScheduledLesson)
admin.site.register(Assessment)
admin.site.register(Grade)
admin.site.register(DeviceToken)
admin.site.register(NationalHolidayCache)
