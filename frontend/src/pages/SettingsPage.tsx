import { FormEvent, useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";

type SchoolRow = {
  id: number;
  name: string;
  city: string;
  state: string;
};

type GoogleStatus = {
  credentials_configured: boolean;
  drive: { connected: boolean; message: string };
  calendar: { connected: boolean; message: string };
  classroom: { connected: boolean; message: string };
};

type CountryDate = {
  name: string;
  date: string;
};

export function SettingsPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [countryDates, setCountryDates] = useState<CountryDate[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const loadInitialData = async () => {
    try {
      const [schoolsResp, googleResp, countryResp] = await Promise.all([
        api.get<SchoolRow[]>("/schools/"),
        api.get<GoogleStatus>("/integrations/google/status/"),
        api.get<{ dates: CountryDate[] }>("/calendar/country-dates/"),
      ]);
      setSchools(schoolsResp.data);
      setGoogleStatus(googleResp.data);
      setCountryDates(countryResp.data.dates.slice(0, 8));
    } catch {
      setSchools([]);
      setGoogleStatus(null);
      setCountryDates([]);
    }
  };

  useEffect(() => {
    void loadInitialData();
  }, []);

  const integrations = useMemo(
    () => [
      { label: "Google Drive", key: "drive", data: googleStatus?.drive, url: "https://drive.google.com" },
      { label: "Google Agenda", key: "calendar", data: googleStatus?.calendar, url: "https://calendar.google.com" },
      { label: "Google Classroom", key: "classroom", data: googleStatus?.classroom, url: "https://classroom.google.com" },
    ],
    [googleStatus]
  );

  const handleOpenIntegration = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleImport = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedFiles.length === 0) {
      setImportResult("Selecione ao menos um arquivo .csv, .xlsx ou .pdf.");
      return;
    }

    setUploading(true);
    setImportResult("");
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      const { data } = await api.post("/import/enrollments/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const schoolsResp = await api.get<SchoolRow[]>("/schools/");
      setSchools(schoolsResp.data);
      setImportResult(
        `Processadas: ${data.processed_rows} | Puladas: ${data.skipped_rows} | Escolas: ${data.schools_created_or_updated} | Turmas: ${data.class_groups_created_or_updated} | Alunos: ${data.students_created_or_updated}`
      );
    } catch {
      setImportResult("Falha na importação. Verifique o formato dos arquivos e tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Configurações</p>
          <h1>Configuração do Sistema</h1>
          <p>Cadastre escolas, períodos, grade de horários e feriados manuais.</p>
        </div>
        <button className="btn-secondary" type="button">Exportar Relatório</button>
      </header>

      <section className="content-grid settings-grid">
        <div className="panel panel-span">
          <header>
            <h2>Unidades Escolares</h2>
          </header>
          <table className="timetable-table">
            <thead>
              <tr>
                <th>Escola</th>
                <th>Cidade</th>
                <th>UF</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.city}</td>
                  <td>{s.state}</td>
                </tr>
              ))}
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={3}>Nenhuma escola cadastrada ainda.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <aside className="panel">
          <header>
            <h2>Integrações Google</h2>
            <button className="btn-secondary" type="button" onClick={() => void loadInitialData()}>Atualizar status</button>
          </header>
          <div className="class-list">
            {integrations.map((integration) => (
              <article key={integration.label} className="class-card">
                <strong>{integration.label}</strong>
                <p>{integration.data?.connected ? "Conectado" : "Não conectado"}</p>
                <span>{integration.data?.message ?? "Sem informação"}</span>
                <div className="header-actions">
                  <button
                    className="btn-primary"
                    type="button"
                    onClick={() => handleOpenIntegration(integration.url)}
                  >
                    {integration.data?.connected ? "Abrir" : "Conectar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel holidays-panel">
        <header className="table-header-row">
          <h2>Datas Nacionais (feriados e observâncias)</h2>
          <button className="btn-primary" type="button">Atualizado via API</button>
        </header>
        <table className="timetable-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nome</th>
            </tr>
          </thead>
          <tbody>
            {countryDates.map((item) => (
              <tr key={`${item.date}-${item.name}`}>
                <td>{item.date}</td>
                <td>{item.name}</td>
              </tr>
            ))}
            {countryDates.length === 0 ? (
              <tr>
                <td colSpan={2}>Nenhuma data carregada.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <header className="table-header-row">
          <h2>Importação de Alunos/Turmas/Escolas</h2>
        </header>
        <form onSubmit={handleImport} className="form-grid">
          <label>
            Arquivos
            <input
              type="file"
              multiple
              accept=".csv,.xlsx,.pdf"
              onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
            />
          </label>
          <button className="btn-primary" type="submit" disabled={uploading}>
            {uploading ? "Importando..." : "Importar arquivos"}
          </button>
        </form>
        {importResult ? <p>{importResult}</p> : null}
      </section>
    </>
  );
}
