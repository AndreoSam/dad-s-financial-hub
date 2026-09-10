const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const isDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

const subtractCalendarMonth = (dateString) => {
  if (!isDateString(dateString)) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const clampedDay = Math.min(day, daysInMonth(previousYear, previousMonth));
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
};

const weekday = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return DAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
};

const reminderReason = (today, maturityDate) => {
  if (!isDateString(today) || !isDateString(maturityDate)) return null;
  const reminderStart = subtractCalendarMonth(maturityDate);
  if (!reminderStart || today < reminderStart || today > maturityDate) return null;
  if (today === maturityDate) return "matures-today";
  if (today === reminderStart) return "one-month";
  if (weekday(today) === "Saturday") return "saturday";
  return null;
};

module.exports = { isDateString, reminderReason, subtractCalendarMonth, weekday };
