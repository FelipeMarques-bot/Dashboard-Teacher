import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { month: "Fev", average: 7.1 },
  { month: "Mar", average: 7.4 },
  { month: "Abr", average: 7.2 },
  { month: "Mai", average: 7.8 },
  { month: "Jun", average: 8.0 },
];

export function GradesChart() {
  return (
    <section className="panel">
      <header>
        <h2>Evolucao das Notas</h2>
        <span>Media por bimestre</span>
      </header>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#079A8C" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#079A8C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#d7e2dc" />
            <XAxis dataKey="month" stroke="#4a5a54" />
            <YAxis stroke="#4a5a54" domain={[0, 10]} />
            <Tooltip />
            <Area type="monotone" dataKey="average" stroke="#056f66" fill="url(#colorAvg)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
