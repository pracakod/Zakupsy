export interface HolidayItem {
  name: string;
  month: number; // 1-12
  day: number;   // 1-31
  desc: string;
  icon: string;
}

export const BASE_HOLIDAYS: HolidayItem[] = [
  { name: "Wielkanoc", month: 4, day: 5, desc: "Radosne święto wiosenne.", icon: "🐣" }, // przybliżona/stała w danym roku
  { name: "Majówka", month: 5, day: 1, desc: "Czas na grillowanie i relaks.", icon: "🔥" },
  { name: "Dzień Matki", month: 5, day: 26, desc: "Święto wszystkich mam. Pamiętaj o kwiatach!", icon: "👩‍👧‍👦" },
  { name: "Dzień Dziecka", month: 6, day: 1, desc: "Czas na prezenty i wspólne zabawy.", icon: "🎈" },
  { name: "Dzień Ojca", month: 6, day: 23, desc: "Wyraź wdzięczność swojemu tacie.", icon: "👔" },
  { name: "Początek Wakacji", month: 6, day: 26, desc: "Przygotuj się na wyjazdy i letnie zakupy.", icon: "☀️" },
  { name: "Wszystkich Świętych", month: 11, day: 1, desc: "Czas zadumy i pamięci o tych, którzy odeszli.", icon: "🕯️" },
  { name: "Boże Narodzenie", month: 12, day: 24, desc: "Największe zakupy w roku. Zaplanuj je wcześniej!", icon: "🎄" },
];

export interface ProcessedHoliday extends HolidayItem {
  dateStr: string; // YYYY-MM-DD
  daysLeft: number;
  formattedDate: string; // np. "26 maja"
}

export function getUpcomingHolidays(referenceDate: Date = new Date()): ProcessedHoliday[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();

  const processed = BASE_HOLIDAYS.map(h => {
    let targetDate = new Date(currentYear, h.month - 1, h.day);
    targetDate.setHours(0, 0, 0, 0);

    // Jeśli w tym roku to święto już minęło, to ustawiamy je na następny rok
    if (targetDate.getTime() < today.getTime()) {
      targetDate.setFullYear(currentYear + 1);
    }

    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, '0');
    const d = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const formattedDate = targetDate.toLocaleDateString("pl-PL", { day: 'numeric', month: 'long' });

    return {
      ...h,
      dateStr,
      daysLeft,
      formattedDate
    };
  });

  // Sortujemy po liczbie dni pozostałych (najbliższe święta jako pierwsze)
  return processed.sort((a, b) => a.daysLeft - b.daysLeft);
}
