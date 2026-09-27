/** Tuition / payment math. Pure functions, no I/O — easy to reason about and test. */

const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM' for a Date (defaults to now). */
export function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** Parse 'YYYY-MM' into a sortable numeric key: 202610 */
export function periodKey(period) {
  const [y, m] = String(period).split('-');
  return Number(y) * 100 + Number(m);
}

function monthKey(date) {
  return date.getFullYear() * 100 + (date.getMonth() + 1);
}

/** First period a student is billed from, based on their enrolment date. */
export function startPeriod(student, fallback = currentPeriod()) {
  if (!student?.created_at) return fallback;
  return currentPeriod(new Date(student.created_at));
}

/**
 * Every billing period from a student's first month up to `until`.
 * e.g. startPeriod 2026-09, until 2026-11  ->  ['2026-09','2026-10','2026-11']
 */
export function billingPeriods(student, until = currentPeriod()) {
  const start = new Date(`${startPeriod(student)}-01T00:00:00Z`);
  const end = new Date(`${until}-01T00:00:00Z`);
  const out = [];
  const cur = new Date(start);
  // Guard against a bad/future created_at producing an unbounded loop.
  for (let i = 0; i < 240 && cur <= end; i++) {
    out.push(currentPeriod(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

/**
 * Roll a student's payments into a single financial picture.
 * Status is about *this* month, which is what the badges colour.
 */
export function summarizeFees(student, payments) {
  const fee = Number(student?.monthly_fee ?? 0);
  const now = currentPeriod();
  const periods = billingPeriods(student, now);

  // Only count payments that fall inside a billed month. A payment
  // recorded for a future month is a pre-payment, and must not wipe
  // out the balance for the months actually due.
  const billed = new Set(periods);
  const paidPeriods = new Map();
  let paid = 0;
  for (const p of payments) {
    if (billed.has(p.period)) {
      paid += Number(p.amount ?? 0);
      paidPeriods.set(p.period, p);
    }
  }
  // Pre-payments are still shown, just not netted off what is due.
  const prepaid = payments.filter((p) => !billed.has(p.period));
  const credit = prepaid.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const expected = fee * periods.length;
  const balance = Math.max(0, expected - paid);

  const currentPayment = paidPeriods.get(now) ?? null;
  const currentStatus = !currentPayment
    ? 'unpaid'
    : fee > 0 && Number(currentPayment.amount) < fee
      ? 'partial'
      : 'paid';

  return {
    fee,
    periods,
    expected,
    paid,
    balance,
    credit,
    prepaid,
    currentStatus,
    currentPeriod: now,
    paidPeriods,
    overdueCount: periods.filter((p) => periodKey(p) < periodKey(now) && !paidPeriods.has(p))
      .length,
  };
}
