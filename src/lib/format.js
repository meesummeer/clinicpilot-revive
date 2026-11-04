// All dates and times are shown in Asia/Karachi, whatever the viewer's machine says.
const TZ = 'Asia/Karachi';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ymdKarachi(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export const todayKarachi = () => ymdKarachi();
export const startOfMonthKarachi = () => `${todayKarachi().slice(0, 7)}-01`;

export function hhmmKarachi(value) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
export const karachiToIso = (date, time) => new Date(`${date}T${time}:00+05:00`).toISOString();

// Takes 'YYYY-MM-DD' or a full timestamp and returns e.g. "04 Nov 2026".
export function formatDate(value) {
  if (!value) return '—';
  const s = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ymdKarachi(value);
  const [y, m, d] = s.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}
export function formatTime(value) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));
}
export function formatMoney(value) {
  return 'Rs ' + (Number(value) || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
}
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Last n months including this one, oldest first: [{ yyyyMm: '2026-08', label: 'Aug 2026' }, ...]
export function lastNMonthsKarachi(n) {
  const [y, m] = todayKarachi().split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    const my = Math.floor(idx / 12), mm = idx % 12;
    out.push({ yyyyMm: `${my}-${String(mm + 1).padStart(2, '0')}`, label: `${MONTHS[mm]} ${my}` });
  }
  return out;
}

// "0333 2268732" -> "923332268732", the digits-only form wa.me needs.
export function toWhatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return '92' + digits.slice(1);
  return digits.length === 10 ? '92' + digits : digits;
}
// Last 10 digits, so 0300-1234567 and +92 300 1234567 count as the same phone.
export function phoneKey(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : null;
}

export const APPOINTMENT_STATUS = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const EXPENSE_CATEGORIES = {
  general: 'General',
  salary: 'Salary',
  utility: 'Utility Bills',
  miscellaneous: 'Miscellaneous',
  doctors_share: "Doctor's Share",
  lab: 'Lab',
  material: 'Material',
};

// Suggestions only; the field stays free text.
export const PROCEDURE_SUGGESTIONS = [
  'Consultation', 'Laser Hair Removal', 'Chemical Peel', 'Hydrafacial', 'Carbon Peel', 'BioRePeel',
  'Hair PRP', 'Face PRP', 'Dental Scaling', 'Teeth Whitening',
];
