import { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { getScheduleInfo, getShiftLabel } from "../lib/classSchedule";

type StudentGradeRow = {
  id: number;
  name: string;
  p1: number;
  p2: number;
  p3: number;
  simulado: number;
  notes: string;
};

type ClassCard = {
  id: number;
  school: number;
  name: string;
  school_name: string;
  shift: string;
  students_count: number;
};

type StudentApiRow = {
  id: number;
  full_name: string;
};

type SubjectApiRow = {
  id: number;
  school: number;
};

type AssessmentApiRow = {
  id: number;
  class_group: number;
  title: string;
};

type GradeApiRow = {
  id: number;
  assessment: number;
  student: number;
  value: string | number;
  notes: string;
};

type Paginated<T> = {
  results?: T[];
};

type GradeField = "p1" | "p2" | "p3" | "simulado";

const assessmentTitleByField: Record<GradeField, string> = {
  p1: "Teste 01",
  p2: "Prova 01",
  p3: "Trabalho",
  simulado: "Simulado",
};

function listFromResponse<T>(payload: T[] | Paginated<T>): T[] {
  return Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
}

type TurmasPageProps = {
  externalQuery?: string;
};

export function TurmasPage({ externalQuery = "" }: TurmasPageProps) {
  const [rows, setRows] = useState<StudentGradeRow[]>([]);
  const [classCards, setClassCards] = useState<ClassCard[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [filter, setFilter] = useState("");
  const [loadingRows, setLoadingRows] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingClasses, setUploadingClasses] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editClassName, setEditClassName] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassSchoolId, setNewClassSchoolId] = useState<number | null>(null);
  const [newClassShift, setNewClassShift] = useState("morning");
  const [schools, setSchools] = useState<Array<{ id: number; name: string }>>([]);

  const selectedClass = useMemo(
    () => classCards.find((item) => item.id === selectedClassId) ?? null,
    [classCards, selectedClassId],
  );

  const loadClassGroups = async () => {
    try {
      const { data } = await api.get<ClassCard[] | Paginated<ClassCard>>("/class-groups/");
      const groups = listFromResponse(data);
      setClassCards(groups);
      if (groups.length > 0) {
        setSelectedClassId((current) => current ?? groups[0].id);
      }
    } catch {
      setClassCards([]);
      setSelectedClassId(null);
    }
  };

  useEffect(() => {
    void loadClassGroups();
  }, []);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data } = await api.get<Array<{ id: number; name: string }> | { results: Array<{ id: number; name: string }> }>("/schools/");
        const payload = Array.isArray(data) ? data : data.results ?? [];
        setSchools(payload);
        if (payload.length > 0 && !newClassSchoolId) {
          setNewClassSchoolId(payload[0].id);
        }
      } catch {
        setSchools([]);
      }
    };
    void loadSchools();
  }, [newClassSchoolId]);

  useEffect(() => {
    setFilter(externalQuery);
  }, [externalQuery]);

  useEffect(() => {
    if (!selectedClass) {
      setRows([]);
      return;
    }

    const loadClassRows = async () => {
      setLoadingRows(true);
      setSaveMessage("");
      try {
        const [{ data: studentsRaw }, { data: assessmentsRaw }, { data: subjectsRaw }] = await Promise.all([
          api.get<StudentApiRow[] | Paginated<StudentApiRow>>(`/students/?class_group=${selectedClass.id}`),
          api.get<AssessmentApiRow[] | Paginated<AssessmentApiRow>>(`/assessments/?class_group=${selectedClass.id}`),
          api.get<SubjectApiRow[] | Paginated<SubjectApiRow>>(`/subjects/?school=${selectedClass.school}`),
        ]);

        const students = listFromResponse(studentsRaw);
        const assessments = listFromResponse(assessmentsRaw);
        const subjects = listFromResponse(subjectsRaw);

        setSelectedSubjectId(subjects[0]?.id ?? null);

        const assessmentByField = (Object.keys(assessmentTitleByField) as GradeField[]).reduce(
          (acc, field) => {
            acc[field] = assessments.find((item) => item.title === assessmentTitleByField[field]) ?? null;
            return acc;
          },
          {} as Record<GradeField, AssessmentApiRow | null>,
        );

        const gradesByField = {} as Record<GradeField, GradeApiRow[]>;
        for (const field of Object.keys(assessmentByField) as GradeField[]) {
          const assessment = assessmentByField[field];
          if (!assessment) {
            gradesByField[field] = [];
            continue;
          }

          const { data: gradeRaw } = await api.get<GradeApiRow[] | Paginated<GradeApiRow>>(
            `/grades/?assessment=${assessment.id}`,
          );
          gradesByField[field] = listFromResponse(gradeRaw);
        }

        const nextRows = students.map((student) => {
          const p1 = gradesByField.p1.find((g) => g.student === student.id);
          const p2 = gradesByField.p2.find((g) => g.student === student.id);
          const p3 = gradesByField.p3.find((g) => g.student === student.id);
          const simulado = gradesByField.simulado.find((g) => g.student === student.id);

          return {
            id: student.id,
            name: student.full_name,
            p1: Number(p1?.value ?? 0),
            p2: Number(p2?.value ?? 0),
            p3: Number(p3?.value ?? 0),
            simulado: Number(simulado?.value ?? 0),
            notes: simulado?.notes || p1?.notes || p2?.notes || p3?.notes || "",
          };
        });

        setRows(nextRows);
      } catch {
        setRows([]);
      } finally {
        setLoadingRows(false);
      }
    };

    void loadClassRows();
  }, [selectedClass]);

  const updateCell = (id: number, field: keyof StudentGradeRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (field === "notes") return { ...r, notes: value };
        return { ...r, [field]: Number(value) } as StudentGradeRow;
      })
    );
  };

  const rowsWithAverage = useMemo(
    () =>
      rows.map((r) => {
        const avg = (r.p1 + r.p2 + r.p3 + r.simulado) / 4;
        return { ...r, avg };
      }),
    [rows]
  );

  const visibleClassCards = classCards.filter((item) => {
    const term = filter.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return item.name.toLowerCase().includes(term) || item.school_name.toLowerCase().includes(term);
  }).sort((a, b) => {
    const aSchedule = getScheduleInfo(a.school_name, a.shift);
    const bSchedule = getScheduleInfo(b.school_name, b.shift);
    if (aSchedule.weekdayOrder !== bSchedule.weekdayOrder) {
      return aSchedule.weekdayOrder - bSchedule.weekdayOrder;
    }
    if (a.shift !== b.shift) {
      if (a.shift === "morning") return -1;
      if (b.shift === "morning") return 1;
      if (a.shift === "afternoon") return -1;
      if (b.shift === "afternoon") return 1;
    }
    return a.school_name.localeCompare(b.school_name, "pt-BR");
  });

  const handleSaveInlineClass = async (classGroupId: number) => {
    if (!editClassName.trim()) return;
    try {
      await api.patch(`/class-groups/${classGroupId}/`, { name: editClassName.trim() });
      setSaveMessage("Turma atualizada com sucesso.");
      setEditingClassId(null);
      await loadClassGroups();
    } catch {
      setSaveMessage("Não foi possível atualizar a turma.");
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) {
      return;
    }

    const confirmed = window.confirm(`Excluir a turma ${selectedClass.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/class-groups/${selectedClass.id}/`);
      setSaveMessage("Turma excluída com sucesso.");
      setSelectedClassId(null);
      await loadClassGroups();
    } catch {
      setSaveMessage("Não foi possível excluir a turma.");
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !newClassSchoolId) {
      setSaveMessage("Informe escola e nome da turma.");
      return;
    }

    try {
      await api.post("/class-groups/", {
        school: newClassSchoolId,
        name: newClassName.trim(),
        grade_level: newClassName.trim(),
        shift: newClassShift,
      });
      setNewClassName("");
      setSaveMessage("Turma criada com sucesso.");
      await loadClassGroups();
    } catch {
      setSaveMessage("Não foi possível criar a turma.");
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedClass) {
      setSaveMessage("Selecione uma turma para salvar.");
      return;
    }
    if (!selectedSubjectId) {
      setSaveMessage("Nenhuma disciplina encontrada para esta escola. Cadastre uma disciplina para continuar.");
      return;
    }

    setSaving(true);
    setSaveMessage("");
    try {
      const { data: existingAssessmentsRaw } = await api.get<AssessmentApiRow[] | Paginated<AssessmentApiRow>>(
        `/assessments/?class_group=${selectedClass.id}`,
      );
      const existingAssessments = listFromResponse(existingAssessmentsRaw);
      const assessmentIdsByField = {} as Record<GradeField, number>;

      for (const field of Object.keys(assessmentTitleByField) as GradeField[]) {
        const title = assessmentTitleByField[field];
        let assessment = existingAssessments.find((item) => item.title === title);

        if (!assessment) {
          const { data: created } = await api.post<AssessmentApiRow>("/assessments/", {
            class_group: selectedClass.id,
            subject: selectedSubjectId,
            teacher: null,
            title,
            scheduled_date: new Date().toISOString().slice(0, 10),
            notification_lead_days: 2,
          });
          assessment = created;
        }

        assessmentIdsByField[field] = assessment.id;
      }

      const existingGradesByField = {} as Record<GradeField, GradeApiRow[]>;
      for (const field of Object.keys(assessmentIdsByField) as GradeField[]) {
        const assessmentId = assessmentIdsByField[field];
        const { data: gradesRaw } = await api.get<GradeApiRow[] | Paginated<GradeApiRow>>(
          `/grades/?assessment=${assessmentId}`,
        );
        existingGradesByField[field] = listFromResponse(gradesRaw);
      }

      for (const row of rows) {
        for (const field of Object.keys(assessmentIdsByField) as GradeField[]) {
          const assessmentId = assessmentIdsByField[field];
          const value = Number(row[field]);
          const existing = existingGradesByField[field].find((g) => g.student === row.id);

          if (existing) {
            await api.patch(`/grades/${existing.id}/`, {
              value,
              notes: row.notes,
            });
          } else {
            await api.post("/grades/", {
              assessment: assessmentId,
              student: row.id,
              value,
              notes: row.notes,
            });
          }
        }
      }

      setSaveMessage("Alterações salvas com sucesso.");
    } catch {
      setSaveMessage("Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadClassGroups = async () => {
    if (selectedFiles.length === 0) {
      setUploadResult("Selecione ao menos um arquivo.");
      return;
    }

    setUploadingClasses(true);
    setUploadResult("");
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      const { data } = await api.post("/import/class-groups/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadResult(
        `Processadas: ${data.processed_rows} | Puladas: ${data.skipped_rows} | Turmas: ${data.class_groups_created_or_updated}`,
      );
      await loadClassGroups();
    } catch {
      setUploadResult("Falha ao importar turmas.");
    } finally {
      setUploadingClasses(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Turmas</p>
          <h1>Gestão de Notas por Turma</h1>
          <p>Selecione uma turma e lance notas direto na tabela com cálculo automático de média.</p>
        </div>
      </header>

      <section className="content-grid classes-layout">
        <aside className="panel class-list-panel">
          <header>
            <h2>Turmas Ativas</h2>
          </header>
          <div className="table-header-row import-inline">
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.pdf"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            />
            <button className="btn-primary" type="button" disabled={uploadingClasses} onClick={handleUploadClassGroups}>
              {uploadingClasses ? "Importando..." : "Importar Turmas"}
            </button>
          </div>
          {uploadResult ? <p>{uploadResult}</p> : null}
          <div className="table-header-row">
            <input
              className="login-input"
              placeholder="Filtrar turma"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          <div className="table-header-row import-inline">
            <input className="login-input" placeholder="Nova turma" value={newClassName} onChange={(event) => setNewClassName(event.target.value)} />
            <select className="select-field" value={newClassSchoolId ?? ""} onChange={(event) => setNewClassSchoolId(Number(event.target.value))}>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            <select className="select-field" value={newClassShift} onChange={(event) => setNewClassShift(event.target.value)}>
              <option value="morning">Matutino</option>
              <option value="afternoon">Vespertino</option>
              <option value="evening">Noturno</option>
            </select>
            <button className="btn-primary" type="button" onClick={handleCreateClass}>Incluir Turma</button>
          </div>
          <div className="class-list">
            {visibleClassCards.map((item) => (
              <article
                key={item.id}
                className={item.id === selectedClassId ? "class-card active" : "class-card"}
                onClick={() => setSelectedClassId(item.id)}
              >
                {editingClassId === item.id ? (
                  <input className="login-input" value={editClassName} onChange={(event) => setEditClassName(event.target.value)} />
                ) : (
                  <strong style={{ fontSize: "1.45rem" }}>{item.name}</strong>
                )}
                <p>{item.school_name}</p>
                <span>
                  {getScheduleInfo(item.school_name, item.shift).weekdayLabel} • {getShiftLabel(item.shift)} • {item.students_count} alunos
                </span>
                <div className="header-actions" style={{ marginTop: 8 }}>
                  {editingClassId === item.id ? (
                    <>
                      <button className="btn-primary" type="button" onClick={(event) => { event.stopPropagation(); void handleSaveInlineClass(item.id); }}>Salvar</button>
                      <button className="btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); setEditingClassId(null); }}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); setEditingClassId(item.id); setEditClassName(item.name); }}>Editar</button>
                      <button className="btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); setSelectedClassId(item.id); void handleDeleteClass(); }}>Excluir</button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {visibleClassCards.length === 0 ? <p>Nenhuma turma encontrada.</p> : null}
          </div>
        </aside>

        <div className="panel panel-span">
          <header className="table-header-row">
            <div>
              <h2>Turma {selectedClass?.name ?? "-"}</h2>
              <span>
                {selectedClass
                  ? `${getScheduleInfo(selectedClass.school_name, selectedClass.shift).weekdayLabel} • ${getShiftLabel(selectedClass.shift)} • ${selectedClass.students_count} alunos`
                  : "-"}
              </span>
            </div>
            <div className="header-actions">
              <button className="btn-secondary" type="button" onClick={handleDeleteClass} disabled={!selectedClass}>
                Excluir Turma
              </button>
              <button className="btn-primary" type="button" onClick={handleSaveChanges} disabled={saving}>
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </header>
          {saveMessage ? <p>{saveMessage}</p> : null}

          <table className="timetable-table grades-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Teste 01</th>
                <th>Prova 01</th>
                <th>Trabalho</th>
                <th>Simulado</th>
                <th>Média</th>
                <th>Obs.</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr>
                  <td colSpan={7}>Carregando alunos e notas...</td>
                </tr>
              ) : null}
              {rowsWithAverage.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td><input value={r.p1} onChange={(e) => updateCell(r.id, "p1", e.target.value)} /></td>
                  <td><input value={r.p2} onChange={(e) => updateCell(r.id, "p2", e.target.value)} /></td>
                  <td><input value={r.p3} onChange={(e) => updateCell(r.id, "p3", e.target.value)} /></td>
                  <td><input value={r.simulado} onChange={(e) => updateCell(r.id, "simulado", e.target.value)} /></td>
                  <td>
                    <span className={r.avg >= 7 ? "ok-grade" : "warn-grade"}>{r.avg.toFixed(1)}</span>
                  </td>
                  <td><input placeholder="Anotar" value={r.notes} onChange={(e) => updateCell(r.id, "notes", e.target.value)} /></td>
                </tr>
              ))}
              {!loadingRows && rowsWithAverage.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum aluno nesta turma.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
