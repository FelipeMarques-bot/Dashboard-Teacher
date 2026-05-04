import { FormEvent, useEffect, useMemo, useState } from "react";

import { SchoolCalendar } from "../components/SchoolCalendar";
import { api } from "../lib/api";

type School = { id: number; name: string };
type CalendarEvent = { id: number; title: string; date: string; event_type?: string };

export function CalendarPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [form, setForm] = useState({
    title: "",
    date: "",
    event_type: "municipal_holiday",
  });

  const colorForType = (eventType?: string): string | undefined => {
    if (eventType === "national_holiday") return "#2956d2";
    if (eventType === "municipal_holiday") return "#8a4af0";
    if (eventType === "pedagogical_stop") return "#f28a21";
    return "#1ea575";
  };

  const calendarEvents = useMemo(
    () => events.map((ev) => ({ title: ev.title, date: ev.date, color: colorForType(ev.event_type) })),
    [events]
  );

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data } = await api.get("/schools/");
        const payload = Array.isArray(data?.results) ? data.results : data;
        setSchools(payload);
        if (payload.length > 0) setSelectedSchoolId(payload[0].id);
      } catch {
        setSchools([]);
      }
    };
    void loadSchools();
  }, []);

  useEffect(() => {
    const loadPreview = async () => {
      if (!selectedSchoolId) {
        setEvents([]);
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const start = `${year}-${month}-01`;
      const end = `${year}-${month}-31`;

      try {
        const { data } = await api.get("/calendar/consolidated-preview/", {
          params: { school_id: selectedSchoolId, start, end },
        });
        setEvents(data.events ?? []);
      } catch {
        setEvents([]);
      }
    };
    void loadPreview();
  }, [selectedSchoolId]);

  const handleCreateEvent = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedSchoolId || !form.title || !form.date) return;

    const year = Number(form.date.slice(0, 4));
    let calendarId: number | null = null;

    const { data: calendars } = await api.get("/academic-calendars/", {
      params: { school: selectedSchoolId, year },
    });
    const list = Array.isArray(calendars?.results) ? calendars.results : calendars;
    if (list.length > 0) {
      calendarId = list[0].id;
    } else {
      const { data: created } = await api.post("/academic-calendars/", {
        school: selectedSchoolId,
        year,
        start_date: `${year}-01-01`,
        end_date: `${year}-12-31`,
      });
      calendarId = created.id;
    }

    await api.post("/calendar-events/", {
      calendar: calendarId,
      event_type: form.event_type,
      scope: "school",
      class_group: null,
      title: form.title,
      description: "Cadastro manual",
      date: form.date,
      city: "",
      state: "",
      is_recurring: false,
    });

    setForm({ title: "", date: "", event_type: "municipal_holiday" });
    const { data: refreshed } = await api.get("/calendar/consolidated-preview/", {
      params: {
        school_id: selectedSchoolId,
        start: `${year}-${String(new Date(form.date).getMonth() + 1).padStart(2, "0")}-01`,
        end: `${year}-${String(new Date(form.date).getMonth() + 1).padStart(2, "0")}-31`,
      },
    });
    setEvents(refreshed.events ?? []);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Calendario</p>
          <h1>Calendario Institucional</h1>
          <p>Visualizacao mensal com legenda por escola, feriados e paradas pedagogicas.</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedSchoolId ?? ""}
            onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
            className="select-field"
          >
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary" type="button">Filtros</button>
          <button className="btn-primary" type="button">Adicionar Evento</button>
        </div>
      </header>

      <section className="content-grid calendar-layout">
        <aside className="panel layer-panel panel-span">
          <header>
            <h2>Calendário</h2>
          </header>

          <div className="calendar-main">
            <SchoolCalendar events={calendarEvents} />
          </div>
        </aside>

        <aside className="panel day-details-panel">
          <header>
            <h2>Terca-feira - 05 de Marco</h2>
          </header>
          <div className="day-card">
            <strong>Fisica Aplicada</strong>
            <p>07:30 - 09:10 | Sala 402</p>
          </div>
          <div className="day-card">
            <strong>Laboratorio de Ciencias</strong>
            <p>10:30 - 12:10 | Sala Principal</p>
          </div>

          <hr />

          <header>
            <h3>Adicionar evento regional</h3>
          </header>
          <form className="form-grid" onSubmit={handleCreateEvent}>
            <label>
              Nome
              <input
                placeholder="Feriado Municipal"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </label>
            <label>
              Data
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </label>
            <label>
              Tipo
              <select
                className="select-field"
                value={form.event_type}
                onChange={(e) => setForm((prev) => ({ ...prev, event_type: e.target.value }))}
              >
                <option value="municipal_holiday">Municipal</option>
                <option value="state_holiday">Estadual</option>
                <option value="pedagogical_stop">Pedagogico</option>
                <option value="internal_event">Interno</option>
              </select>
            </label>
            <label>Abrangencia<input placeholder="Escola" value="Escola" readOnly /></label>
            <button className="btn-primary" type="submit">Salvar Evento</button>
          </form>

          <div className="day-card">
            <strong>Eventos cadastrados</strong>
            {events.length === 0 ? <p>Nenhum evento para este período.</p> : null}
            {events.map((ev) => (
              <div key={ev.id} className="table-header-row" style={{ marginTop: 8 }}>
                <span>{ev.date} • {ev.title}</span>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={async () => {
                    const confirmed = window.confirm(`Excluir evento ${ev.title}?`);
                    if (!confirmed) return;
                    await api.delete(`/calendar-events/${ev.id}/`);
                    setEvents((prev) => prev.filter((item) => item.id !== ev.id));
                  }}
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
