import { useCallback, useEffect, useState } from 'react';

/* ---------- currency preference ---------- */

export const CURRENCIES = [
  { code: 'MAD', ar: 'د.م.', en: 'MAD' },
  { code: 'USD', ar: '$', en: '$' },
  { code: 'EUR', ar: '€', en: '€' },
  { code: 'GBP', ar: '£', en: '£' },
  { code: 'EGP', ar: 'ج.م', en: 'EGP' },
  { code: 'AED', ar: 'د.إ', en: 'AED' },
  { code: 'SAR', ar: 'ر.س', en: 'SAR' },
  { code: 'TND', ar: 'د.ت', en: 'TND' },
  { code: 'DZD', ar: 'د.ج', en: 'DZD' },
];

const CURRENCY_KEY = 'bb.currency';
const CURRENCY_EVENT = 'bb:currency';

export function useCurrency() {
  const [code, setCodeState] = useState(() => localStorage.getItem(CURRENCY_KEY) || 'MAD');

  const setCode = useCallback((next) => {
    localStorage.setItem(CURRENCY_KEY, next);
    setCodeState(next);
    window.dispatchEvent(new Event(CURRENCY_EVENT));
  }, []);

  useEffect(() => {
    const sync = () => setCodeState(localStorage.getItem(CURRENCY_KEY) || 'MAD');
    window.addEventListener(CURRENCY_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CURRENCY_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return [code, setCode];
}

export function currencySymbol(code, lang) {
  const found = CURRENCIES.find((c) => c.code === code);
  if (!found) return code;
  return lang === 'ar' ? found.ar : found.en;
}

/** 350 -> "350 DH" */
export function formatMoney(amount, code, lang) {
  const n = Number(amount ?? 0);
  const rounded = Math.round(n * 100) / 100;
  const grouped = new Intl.NumberFormat(lang === 'ar' ? 'ar-MA' : 'en-US', {
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(rounded);
  return `${grouped} ${currencySymbol(code, lang)}`;
}

/** Compact form for stat tiles: 12500 -> "12.5k" */
export function formatMoneyShort(amount, code, lang) {
  const n = Number(amount ?? 0);
  if (Math.abs(n) < 10000) return formatMoney(n, code, lang);
  const grouped = new Intl.NumberFormat(lang === 'ar' ? 'ar-MA' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
  return `${grouped} ${currencySymbol(code, lang)}`;
}

/* ---------- dates ---------- */

export function formatDate(iso, lang) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatToday(lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

/** "3 days ago" / "قبل 3 أيام" */
export function formatRelative(iso, lang) {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar' : 'en', { numeric: 'auto' });
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 60) return rtf.format(-mins, 'minute');
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return rtf.format(-days, 'day');
  return formatDate(iso, lang);
}

/* ---------- months ---------- */

export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
];
export const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** '2026-10' -> 'October 2026' / 'أكتوبر 2026' */
export function formatPeriod(period, lang, { short = false } = {}) {
  const [y, m] = String(period).split('-');
  const index = Number(m) - 1;
  if (Number.isNaN(index) || index < 0 || index > 11) return period;
  const names = lang === 'ar' ? MONTHS_AR : MONTHS_EN;
  if (short) return lang === 'ar' ? `${names[index]} ${String(y).slice(2)}` : `${names[index].slice(0,3)} ${String(y).slice(2)}`;
  return lang === 'ar' ? `${names[index]} ${y}` : `${names[index]} ${y}`;
}

/** The list of months offered in a payment form: last 12 through next 1. */
export function recentPeriods(count = 12) {
  const out = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ---------- people ---------- */

/** 'Sara Al-Mansouri' -> 'SA'  |  'سارة المنصوري' -> 'سم' */
export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

/** A stable colour index so each person keeps the same avatar tone. */
export function toneFor(seed) {
  const s = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h % 6;
}
