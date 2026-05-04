const timetable = [
  ["Periodo 1", "Matematica", "Historia", "Matematica", "", "Lingua Inglesa"],
  ["Periodo 2", "", "Fisica", "Artes Visuais", "Matematica", ""],
  ["Periodo 3", "Educacao Fisica", "", "Lingua Inglesa", "Geografia", "Historia"],
];

export function SchedulesPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="page-eyebrow">Schedule Builder</p>
          <h1>Configuracao de Horarios</h1>
          <p>Defina turnos, dias de operacao e grade semanal por turma.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" type="button">
            Gerar Grade Automatica
          </button>
          <button className="btn-primary" type="button">
            Salvar Configuracao
          </button>
        </div>
      </header>

      <section className="panel schedule-panel">
        <div className="schedule-config">
          <div>
            <h3>Turno</h3>
            <div className="chip-row">
              <span className="chip active">Manha</span>
              <span className="chip">Tarde</span>
            </div>
          </div>
          <div>
            <h3>Dias de Operacao</h3>
            <div className="chip-row">
              <span className="chip active">Seg</span>
              <span className="chip active">Ter</span>
              <span className="chip active">Qua</span>
              <span className="chip active">Qui</span>
              <span className="chip active">Sex</span>
            </div>
          </div>
          <div>
            <h3>Definicao de Periodo</h3>
            <p>5 periodos de 50 minutos - inicio 07:00</p>
          </div>
        </div>

        <table className="timetable-table">
          <thead>
            <tr>
              <th>Horario</th>
              <th>Segunda</th>
              <th>Terca</th>
              <th>Quarta</th>
              <th>Quinta</th>
              <th>Sexta</th>
            </tr>
          </thead>
          <tbody>
            {timetable.map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => (
                  <td key={`${row[0]}-${cell || "vazio"}`}>{cell || "+"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
