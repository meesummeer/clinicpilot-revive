import { todayKarachi } from './format';

// service_log.service always stores `name`; `label` only changes how it reads on a plan.
// total: null means unlimited.
export const PLANS = {
  '6month': {
    label: '6-Month', months: 6, perks: [],
    services: [
      { name: 'Laser Hair Removal', total: 6 },
      { name: 'Chemical Peel (Glycolic/Salicylic)', total: 3 },
      { name: 'Hydrafacial / Carbon Peel', total: 3 },
      { name: 'Hair or Face PRP', total: 3 },
      { name: 'Dental Scaling', total: 1 },
      { name: 'Consultation', label: 'Consultations', total: null },
    ],
  },
  annual: {
    label: 'Annual', months: 12, perks: ['5% discount on selected pharma products'],
    services: [
      { name: 'Laser Hair Removal', total: 10 },
      { name: 'Chemical Peel (Glycolic/Salicylic)', total: 3 },
      { name: 'Hydrafacial / Carbon Peel', total: 3 },
      { name: 'BioRePeel', total: 3 },
      { name: 'Hair or Face PRP', label: 'Hair or Face PRP (with Booster)', total: 4 },
      { name: 'Dental Scaling', total: 1 },
      { name: 'Teeth Whitening', total: 1 },
      { name: 'Consultation', label: 'Consultations', total: null },
    ],
  },
};
export const EXPIRING_DAYS = 30;
export const STATUS_LABEL = { active: 'Active', expiring: 'Expiring soon', expired: 'Expired', paused: 'Paused' };

const parts = (s) => { const [y, m, d] = String(s).split('-').map(Number); return { y, m, d }; };
const pad = (n) => String(n).padStart(2, '0');

// Same day N months later, clamped to month end (31 Aug + 6 months = 28 Feb).
export function addMonths(s, n) {
  const { y, m, d } = parts(s);
  const idx = y * 12 + (m - 1) + n;
  const ny = Math.floor(idx / 12), nm = idx % 12 + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, lastDay))}`;
}
export function daysBetween(a, b) {
  const p = parts(a), q = parts(b);
  return Math.round((Date.UTC(q.y, q.m - 1, q.d) - Date.UTC(p.y, p.m - 1, p.d)) / 86400000);
}
export const daysUntil = (s) => daysBetween(todayKarachi(), s);

export function displayStatus(m) {
  if (m.status === 'paused') return 'paused';
  if (m.status === 'expired') return 'expired';
  if (!m.end_date) return 'active';
  const left = daysUntil(m.end_date);
  if (left < 0) return 'expired';
  return left <= EXPIRING_DAYS ? 'expiring' : 'active';
}
export const isCurrent = (m) => ['active', 'expiring'].includes(displayStatus(m));
export const planOf = (m) => PLANS[m.plan] || PLANS['6month'];
export const cardNum = (m) => { const x = /^RC-(\d+)$/.exec(m.card_number || ''); return x ? Number(x[1]) : 0; };
export const nextCardNumber = (members) =>
  `RC-${String(members.reduce((max, m) => Math.max(max, cardNum(m)), 0) + 1).padStart(3, '0')}`;

export function trackerFor(member, logs) {
  const mine = logs.filter((l) => l.member_id === member.id);
  return planOf(member).services.map((s) => ({
    ...s,
    label: s.label || s.name,
    used: mine.filter((l) => l.service === s.name).length,
  }));
}
export const expiringSoon = (members) =>
  members.filter((m) => displayStatus(m) === 'expiring').sort((a, b) => a.end_date.localeCompare(b.end_date));
export const byDateDesc = (a, b) => String(b.date || '').localeCompare(String(a.date || ''));
