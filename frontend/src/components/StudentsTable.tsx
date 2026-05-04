import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

type StudentRow = {
  name: string;
  classGroup: string;
  average: number;
};

const columnHelper = createColumnHelper<StudentRow>();

const columns = [
  columnHelper.accessor("name", {
    header: "Aluno",
  }),
  columnHelper.accessor("classGroup", {
    header: "Turma",
  }),
  columnHelper.accessor("average", {
    header: "Media",
    cell: (info) => info.getValue().toFixed(1),
  }),
];

const data: StudentRow[] = [
  { name: "Ana Clara", classGroup: "7A", average: 8.3 },
  { name: "Bruno Lima", classGroup: "7A", average: 7.2 },
  { name: "Camila Souza", classGroup: "8B", average: 9.1 },
];

export function StudentsTable() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="panel">
      <header>
        <h2>Notas por Aluno</h2>
        <span>Edicao inline pode ser adicionada nessa base</span>
      </header>
      <table className="students-table">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
