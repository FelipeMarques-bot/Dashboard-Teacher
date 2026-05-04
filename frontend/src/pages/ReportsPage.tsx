import { GradesChart } from "../components/GradesChart";

export function ReportsPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Relatorios</p>
          <h1>Indicadores e Relatorios</h1>
          <p>Visualize tendencias de desempenho, frequencia e evolucao por periodo letivo.</p>
        </div>
        <button className="btn-secondary" type="button">Exportar PDF</button>
      </header>

      <section className="content-grid">
        <div className="panel panel-span">
          <GradesChart />
        </div>
        <aside className="panel">
          <header>
            <h2>Resumo Geral</h2>
          </header>
          <ul className="alert-list">
            <li><strong>Media institucional:</strong> 7.8</li>
            <li><strong>Turmas com alerta:</strong> 4</li>
            <li><strong>Meta de frequencia:</strong> 94%</li>
            <li><strong>Avaliacoes concluidas:</strong> 128</li>
          </ul>
        </aside>
      </section>
    </>
  );
}
