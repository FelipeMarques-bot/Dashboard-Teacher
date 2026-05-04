import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { getScheduleInfo, getShiftLabel } from "../lib/classSchedule";

type StudentRow = {
  id: number;
  school: number;
  class_group: number;
  full_name: string;
  class_group_name: string;
  class_group_shift?: string;
  school_name: string;
  enrollment_code: string;
};

type ClassGroupOption = {
  id: number;
  school: number;
  school_name: string;
  name: string;
  shift: string;
};

type StudentsPageProps = {
  externalQuery?: string;
};

export function StudentsPage({ externalQuery = "" }: StudentsPageProps) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editClassGroupId, setEditClassGroupId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newClassGroupId, setNewClassGroupId] = useState<number | null>(null);
  const [savingInline, setSavingInline] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<StudentRow[]>('/students/');
      setStudents(data);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, []);

  useEffect(() => {
    const loadClassGroups = async () => {
      try {
        const { data } = await api.get<ClassGroupOption[] | { results: ClassGroupOption[] }>("/class-groups/");
        const payload = Array.isArray(data) ? data : data.results ?? [];
        setClassGroups(payload);
        if (payload.length > 0 && !newClassGroupId) {
          setNewClassGroupId(payload[0].id);
        }
      } catch {
        setClassGroups([]);
      }
    };
    void loadClassGroups();
  }, [newClassGroupId]);

  useEffect(() => {
    setFilter(externalQuery);
  }, [externalQuery]);

  const visibleStudents = students.filter((student) => {
    const term = filter.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return (
      student.full_name.toLowerCase().includes(term) ||
      student.class_group_name.toLowerCase().includes(term) ||
      student.school_name.toLowerCase().includes(term) ||
      (student.class_group_shift ?? "").toLowerCase().includes(term)
    );
  });

  const sortedStudents = [...visibleStudents].sort((a, b) => {
    const aInfo = getScheduleInfo(a.school_name, a.class_group_shift || "morning");
    const bInfo = getScheduleInfo(b.school_name, b.class_group_shift || "morning");
    if (aInfo.weekdayOrder !== bInfo.weekdayOrder) return aInfo.weekdayOrder - bInfo.weekdayOrder;
    return a.full_name.localeCompare(b.full_name, "pt-BR");
  });

  const startEdit = (student: StudentRow) => {
    setEditingStudentId(student.id);
    setEditName(student.full_name);
    setEditClassGroupId(student.class_group);
  };

  const handleSaveEdit = async (student: StudentRow) => {
    if (!editClassGroupId || !editName.trim()) {
      setUploadResult("Preencha nome e turma para salvar.");
      return;
    }

    const group = classGroups.find((item) => item.id === editClassGroupId);
    if (!group) {
      setUploadResult("Turma selecionada inválida.");
      return;
    }

    setSavingInline(true);
    try {
      await api.patch(`/students/${student.id}/`, {
        full_name: editName.trim(),
        class_group: group.id,
        school: group.school,
        enrollment_code: student.enrollment_code,
      });
      setEditingStudentId(null);
      await loadStudents();
    } catch {
      setUploadResult("Não foi possível salvar o aluno.");
    } finally {
      setSavingInline(false);
    }
  };

  const handleDeleteStudent = async (student: StudentRow) => {
    const confirmed = window.confirm(`Excluir aluno ${student.full_name}?`);
    if (!confirmed) return;

    try {
      await api.delete(`/students/${student.id}/`);
      await loadStudents();
    } catch {
      setUploadResult("Não foi possível excluir o aluno.");
    }
  };

  const handleCreateStudent = async () => {
    if (!newClassGroupId || !newName.trim()) {
      setUploadResult("Preencha nome e turma para incluir aluno.");
      return;
    }

    const group = classGroups.find((item) => item.id === newClassGroupId);
    if (!group) {
      setUploadResult("Turma selecionada inválida.");
      return;
    }

    setSavingInline(true);
    try {
      const generatedCode = `AUTO_${newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24)}_${Date.now()}`;
      await api.post("/students/", {
        full_name: newName.trim(),
        class_group: group.id,
        school: group.school,
        enrollment_code: generatedCode,
      });
      setNewName("");
      await loadStudents();
    } catch {
      setUploadResult("Não foi possível incluir o aluno.");
    } finally {
      setSavingInline(false);
    }
  };

  const handleUploadStudents = async () => {
    if (selectedFiles.length === 0) {
      setUploadResult("Selecione ao menos um arquivo.");
      return;
    }

    setUploading(true);
    setUploadResult("");
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      const { data } = await api.post("/import/students/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadResult(
        `Processadas: ${data.processed_rows} | Puladas: ${data.skipped_rows} | Alunos: ${data.students_created_or_updated}`,
      );
      await loadStudents();
    } catch {
      setUploadResult("Falha ao importar alunos.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Alunos</p>
          <h1>Painel de Alunos</h1>
          <p>Consulta de desempenho, frequência e status acadêmico por escola e turma.</p>
        </div>
      </header>

      <section className="panel">
        <div className="table-header-row import-inline">
          <input
            type="file"
            multiple
            accept=".csv,.xlsx,.pdf"
            onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
          />
          <button className="btn-primary" type="button" disabled={uploading} onClick={handleUploadStudents}>
            {uploading ? "Importando..." : "Importar Alunos"}
          </button>
        </div>
        {uploadResult ? <p>{uploadResult}</p> : null}
        <div className="table-header-row">
          <input
            className="login-input"
            placeholder="Filtrar por aluno, turma, escola, turno ou dia"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
        <div className="table-header-row import-inline">
          <input
            className="login-input"
            placeholder="Novo aluno"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
          <select className="select-field" value={newClassGroupId ?? ""} onChange={(event) => setNewClassGroupId(Number(event.target.value))}>
            {classGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.school_name} • {group.name} • {getShiftLabel(group.shift)}
              </option>
            ))}
          </select>
          <button className="btn-primary" type="button" onClick={handleCreateStudent} disabled={savingInline}>
            Incluir Aluno
          </button>
        </div>
        {loading ? <p>Carregando alunos...</p> : null}
        <table className="timetable-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Escola</th>
              <th>Turma</th>
              <th>Turno</th>
              <th>Dia da semana</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student) => {
              const shift = student.class_group_shift || classGroups.find((g) => g.id === student.class_group)?.shift || "morning";
              const weekday = getScheduleInfo(student.school_name, shift).weekdayLabel;
              const isEditing = editingStudentId === student.id;

              return (
              <tr key={student.id}>
                <td>
                  {isEditing ? (
                    <input className="login-input" value={editName} onChange={(event) => setEditName(event.target.value)} />
                  ) : (
                    student.full_name
                  )}
                </td>
                <td>{student.school_name}</td>
                <td>
                  {isEditing ? (
                    <select className="select-field" value={editClassGroupId ?? ""} onChange={(event) => setEditClassGroupId(Number(event.target.value))}>
                      {classGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.school_name} • {group.name} • {getShiftLabel(group.shift)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    student.class_group_name
                  )}
                </td>
                <td>{getShiftLabel(shift)}</td>
                <td>{weekday}</td>
                <td>
                  <div className="header-actions">
                    {isEditing ? (
                      <>
                        <button className="btn-primary" type="button" onClick={() => void handleSaveEdit(student)} disabled={savingInline}>Salvar</button>
                        <button className="btn-secondary" type="button" onClick={() => setEditingStudentId(null)}>Cancelar</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-secondary" type="button" onClick={() => startEdit(student)}>Editar</button>
                        <button className="btn-secondary" type="button" onClick={() => void handleDeleteStudent(student)}>Excluir</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
            {!loading && sortedStudents.length === 0 ? (
              <tr>
                <td colSpan={6}>Nenhum aluno encontrado. Use a importação em Configurações.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
