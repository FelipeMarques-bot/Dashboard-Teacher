import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { MetricCard } from "../components/MetricCard";
import { api } from "../lib/api";

const weekSchedule = [
  { day: "SEG", entries: ["08:40 Matemática", "10:00 Cálculo"] },
  { day: "TER", entries: ["09:40 Matemática", "10:00 Geometria"] },
  { day: "QUA", entries: ["09:40 Álgebra Linear", "10:00 Cálculo"] },
  { day: "QUI", entries: ["Recesso Pedagógico"] },
  { day: "SEX", entries: ["10:00 Álgebra Linear"] },
  { day: "SAB", entries: [] },
  { day: "DOM", entries: [] },
];

type DashboardMetrics = {
  schools: number;
  class_groups: number;
  students: number;
  upcoming_assessments: number;
};

type DashboardPageProps = {
  displayName: string;
  onLaunchGrades: () => void;
  onViewHistory: () => void;
};

export function DashboardPage({ displayName, onLaunchGrades, onViewHistory }: DashboardPageProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const { data } = await api.get("/dashboard/metrics/");
        setMetrics(data);
      } catch {
        setMetrics(null);
      }
    };
    void loadMetrics();
  }, []);

  return (
    <>
      <header className="page-header">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="page-eyebrow">Início</p>
          <h1>Olá, {displayName}</h1>
          <p>Sua agenda está pronta para hoje. Você tem 4 aulas e 2 reuniões pedagógicas agendadas.</p>
        </motion.div>
        <button className="btn-primary" type="button" onClick={onLaunchGrades}>
          Lançar Notas
        </button>
      </header>

      <section className="welcome-strip">
        <p>
          Segunda-feira, 14 de Outubro
        </p>
      </section>

      <section className="metrics-grid portal-metrics dark-metrics">
        <MetricCard title="Turmas Ativas" value={metrics?.class_groups ?? 0} hint="Dados em tempo real" icon={<span>TR</span>} />
        <MetricCard title="Avaliações Pendentes" value={metrics?.upcoming_assessments ?? 0} hint="Próximos dias" icon={<span>AV</span>} />
        <MetricCard title="Uploads de Arquivos" value={5} hint="Aguardando" icon={<span>UP</span>} />
        <MetricCard title="Total de Alunos" value={metrics?.students ?? 0} hint={`${metrics?.schools ?? 0} escolas`} icon={<span>AL</span>} />
      </section>

      <section className="content-grid">
        <div className="panel panel-span weekly-panel">
          <header>
            <h2>Calendário Semanal</h2>
            <span>Semana atual</span>
          </header>
          <div className="week-grid">
            {weekSchedule.map((d) => (
              <article key={d.day}>
                <strong>{d.day}</strong>
                {d.entries.length === 0 ? (
                  <p className="muted">Sem aula</p>
                ) : (
                  d.entries.map((entry) => <p key={entry}>{entry}</p>)
                )}
              </article>
            ))}
          </div>
          <p className="holiday-note">Feriado nacional - 12 de Outubro (recesso pedagógico antecipado)</p>
        </div>

        <aside className="panel urgent-panel">
          <header>
            <h2>Alertas e Notificações</h2>
            <span>3 novos</span>
          </header>
          <ul className="alert-list">
            <li>
              <strong>Avaliação em 2 dias</strong>
              <p>Turma 7D de Matemática. Revisar arquivo e confirmar.</p>
            </li>
            <li>
              <strong>Upload para Impressão</strong>
              <p>Enviar arquivo para a secretaria antes das 10:00.</p>
            </li>
            <li>
              <strong>Reunião Pedagógica</strong>
              <p>Sexta, 14:30 - Auditoria B.</p>
            </li>
          </ul>
          <button className="btn-secondary full-width" type="button" onClick={onViewHistory}>Ver todo histórico</button>
        </aside>
      </section>
    </>
  );
}
