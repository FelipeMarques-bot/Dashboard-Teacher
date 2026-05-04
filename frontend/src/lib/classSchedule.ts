type ShiftValue = "morning" | "afternoon" | "evening" | string;

type ScheduleInfo = {
  weekdayLabel: string;
  weekdayOrder: number;
};

const scheduleMap: Record<string, ScheduleInfo> = {
  "juvenal|morning": { weekdayLabel: "Segunda", weekdayOrder: 1 },
  "arapongas|afternoon": { weekdayLabel: "Segunda", weekdayOrder: 1 },
  "mulde|morning": { weekdayLabel: "Quarta", weekdayOrder: 3 },
  "anna alves|afternoon": { weekdayLabel: "Quarta", weekdayOrder: 3 },
  "tancredo|morning": { weekdayLabel: "Quinta", weekdayOrder: 4 },
  "tancredo|afternoon": { weekdayLabel: "Quinta", weekdayOrder: 4 },
  "maria helena|afternoon": { weekdayLabel: "Sexta", weekdayOrder: 5 },
};

function normalizeSchool(value: string): string {
  return value.trim().toLowerCase();
}

export function getShiftLabel(shift: ShiftValue): string {
  if (shift === "morning") return "Matutino";
  if (shift === "afternoon") return "Vespertino";
  if (shift === "evening") return "Noturno";
  return "Matutino";
}

export function getScheduleInfo(schoolName: string, shift: ShiftValue): ScheduleInfo {
  const key = `${normalizeSchool(schoolName)}|${shift}`;
  return scheduleMap[key] ?? { weekdayLabel: "Sexta", weekdayOrder: 5 };
}
