import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";

type CalendarEvent = {
  title: string;
  date: string;
  color?: string;
};

type SchoolCalendarProps = {
  events?: CalendarEvent[];
};

const fallbackEvents: CalendarEvent[] = [
  { title: "Avaliacao de Matematica", date: "2026-05-12" },
  { title: "Parada Pedagogica", date: "2026-05-15", color: "#b54a32" },
  { title: "Feriado Municipal", date: "2026-05-20", color: "#8f6c00" },
];

export function SchoolCalendar({ events = fallbackEvents }: SchoolCalendarProps) {
  return (
    <section className="panel calendar-panel">
      <header>
        <h2>Calendario Consolidado</h2>
        <span>Com feriados nacionais, municipais e eventos internos</span>
      </header>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        editable
        events={events}
        height={430}
      />
    </section>
  );
}
