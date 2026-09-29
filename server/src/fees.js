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
  // Fees covered by a payment of nothing. A payment recorded as 0 is how a
  // waived month, a scholarship month or a write-off is entered. That month is
  // settled, so it has to stop counting as outstanding, otherwise the row reads
  // paid while the totals still read owed.
  let waived = 0;
  for (const p of payments) {
    if (billed.has(p.period)) {
      const amount = Number(p.amount ?? 0);
      paid += amount;
      paidPeriods.set(p.period, p);
      if (amount === 0) waived += fee;
    }
  }
  // Pre-payments are still shown, just not netted off what is due.
  const prepaid = payments.filter((p) => !billed.has(p.period));
  const credit = prepaid.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const expected = fee * periods.length;
  const balance = Math.max(0, expected - paid - waived);

  const currentPayment = paidPeriods.get(now) ?? null;
  const currentAmount = currentPayment ? Number(currentPayment.amount ?? 0) : 0;
  const currentStatus =
    // Nothing billed means nothing outstanding. A student on a zero or missing
    // fee was reported as 'unpaid' purely because no payment row existed for
    // the month, which put them in the unpaid filter and showed a red badge
    // next to a balance of zero.
    //
    // A payment of nothing settles the month just as one covering the whole fee
    // does. Judged against the fee on its own it would read as a part payment,
    // which is the opposite of what entering 0 is there to say.
    fee <= 0
      ? 'paid'
      : !currentPayment
        ? 'unpaid'
        : currentAmount === 0 || currentAmount >= fee
          ? 'paid'
          : 'partial';

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
    /**
     * The Map above, flattened to a plain object.
     *
     * This travels to the browser inside the JSON response, and JSON has no
     * Map: it arrives as {} , so every .get() and .has() the client runs on
     * it throws and the page renders blank. One shape for both sides means
     * the lookup style cannot drift apart again.
     */
    paidPeriods: Object.fromEntries(paidPeriods),
    overdueCount: periods.filter((p) => periodKey(p) < periodKey(now) && !paidPeriods.has(p))
      .length,
  };
}
