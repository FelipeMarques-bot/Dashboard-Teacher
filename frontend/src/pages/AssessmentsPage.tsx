import { FormEvent, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";

type Assessment = {
  id: number;
  title: string;
  class_group: number;
  subject: number;
  scheduled_date: string;
  notification_date: string | null;
  notification_sent_at: string | null;
};

type ClassGroup = {
  id: number;
  name: string;
  school: number;
};

type Subject = {
  id: number;
  name: string;
  school: number;
};

type School = {
  id: number;
  name: string;
};

function isWeekend(day: Date): boolean {
  const week = day.getDay();
  return week === 0 || week === 6;
}

const blocked = new Set(["2026-10-12", "2026-11-02"]);

function calcPreviewDate(applyDate: string, lead: number): string {
  if (!applyDate) return "";
  const cursor = new Date(`${applyDate}T12:00:00`);
  let remaining = lead;
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() - 1);
    const iso = cursor.toISOString().slice(0, 10);
    if (!isWeekend(cursor) && !blocked.has(iso)) remaining -= 1;
  }
  return cursor.toISOString().slice(0, 10);
}

export function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [applyDate, setApplyDate] = useState("");
  const [leadDays, setLeadDays] = useState(2);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const classById = useMemo(() => Object.fromEntries(classGroups.map((group) => [group.id, group])), [classGroups]);
  const schoolById = useMemo(() => Object.fromEntries(schools.map((school) => [school.id, school.name])), [schools]);

  const loadAssessments = async () => {
    try {
      const { data } = await api.get("/assessments/");
      setAssessments(Array.isArray(data?.results) ? data.results : data);
    } catch {
      setAssessments([]);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [{ data: cg }, { data: sb }, { data: sc }] = await Promise.all([
          api.get("/class-groups/"),
          api.get("/subjects/"),
          api.get("/schools/"),
        ]);
        const classList = Array.isArray(cg?.results) ? cg.results : cg;
        const subjectList = Array.isArray(sb?.results) ? sb.results : sb;
        const schoolList = Array.isArray(sc?.results) ? sc.results : sc;
        setClassGroups(classList);
        setSubjects(subjectList);
        setSchools(schoolList);

        if (classList.length > 0) setSelectedClassId(classList[0].id);
        if (subjectList.length > 0) setSelectedSubjectId(subjectList[0].id);
      } catch {
        setClassGroups([]);
        setSubjects([]);
        setSchools([]);
      }

      await loadAssessments();
    };

    void bootstrap();
  }, []);

  const previewDate = useMemo(() => calcPreviewDate(applyDate, leadDays), [applyDate, leadDays]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title || !applyDate || !selectedClassId || !selectedSubjectId) {
      setError("Preencha titulo, turma, disciplina e data.");
      return;
    }

    try {
      await api.post("/assessments/", {
        class_group: selectedClassId,
        subject: selectedSubjectId,
        teacher: null,
        title,
        scheduled_date: applyDate,
        notification_lead_days: leadDays,
      });
      setTitle("");
      setDescription("");
      await loadAssessments();
    } catch {
      setError("Nao foi possivel criar a avaliacao agora.");
    }
  };

  const handleDeleteAssessment = async (assessmentId: number) => {
    const confirmed = window.confirm("Excluir esta avaliação?");
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/assessments/${assessmentId}/`);
      await loadAssessments();
    } catch {
      setError("Não foi possível excluir a avaliação.");
    }
  };

  const statusLabel = (assessment: Assessment): string => {
    if (assessment.notification_sent_at) return "Aviso enviado";
    if (assessment.notification_date) return "Agendada";
    return "Em rascunho";
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Avaliacoes</p>
          <h1>Avaliacoes e Impressao</h1>
          <p>Crie provas, ajuste antecedencia de aviso e configure envio para impressao.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" type="button">
            Configurar Impressao
          </button>
          <button className="btn-primary" type="button">
            Nova Avaliacao
          </button>
        </div>
      </header>

      <section className="content-grid">
        <div className="panel-span panel">
          <header>
            <h2>Avaliacoes Ativas</h2>
          </header>
          <table className="timetable-table">
            <thead>
              <tr>
                <th>Avaliacao</th>
                <th>Turma</th>
                <th>Escola</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((assessment) => {
                const group = classById[assessment.class_group];
                const schoolName = group ? schoolById[group.school] ?? "-" : "-";
                return (
                  <tr key={assessment.id}>
                    <td>{assessment.title}</td>
                    <td>{group?.name ?? "-"}</td>
                    <td>{schoolName}</td>
                    <td>{assessment.scheduled_date}</td>
                    <td>{statusLabel(assessment)}</td>
                    <td>
                      <button className="btn-secondary" type="button" onClick={() => void handleDeleteAssessment(assessment.id)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
              {assessments.length === 0 && (
                <tr>
                  <td colSpan={6}>Nenhuma avaliacao cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="panel create-panel">
          <header>
            <h2>Criar Avaliacao</h2>
          </header>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Nome da avaliacao
              <input
                placeholder="Ex: Prova Final de Calculo I"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Descricao
              <input placeholder="Topicos abordados" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label>
              Turma
              <select
                className="select-field"
                value={selectedClassId ?? ""}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
              >
                {classGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Disciplina
              <select
                className="select-field"
                value={selectedSubjectId ?? ""}
                onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data de aplicacao
              <input type="date" value={applyDate} onChange={(e) => setApplyDate(e.target.value)} />
            </label>
            <label>
              Aviso previo para alunos (dias)
              <input type="number" min={1} value={leadDays} onChange={(e) => setLeadDays(Number(e.target.value))} />
            </label>
            <div className="notice-box">
              <strong>Previa de disparo do aviso:</strong>
              <p>{previewDate || "defina a data da avaliacao"}</p>
            </div>
            <label>
              Arquivo para impressao
              <input type="file" />
            </label>
            <label>
              Aviso para impressao (dias)
              <input type="number" min={1} defaultValue={2} />
            </label>
            {error && <div className="login-error">{error}</div>}
            <button className="btn-primary" type="submit">
              Confirmar Agendamento
            </button>
          </form>
        </aside>
      </section>
    </>
  );
}
