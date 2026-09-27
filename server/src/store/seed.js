import crypto from 'node:crypto';

import { hashPassword } from '../auth.js';

const uid = () => crypto.randomUUID();

/** 'YYYY-MM' for a month offset from today. -1 = last month, 0 = this month. */
function monthOffset(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** A plausible payment date inside that month (clamped to today for month 0). */
function dayIn(monthOffsetValue, day) {
  const [y, m] = monthOffsetValue.split('-');
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const chosen = Math.min(day, lastDay);
  const now = new Date();
  const isThisMonth = monthOffsetValue === monthOffset(0);
  if (isThisMonth && chosen > now.getDate()) {
    return `${monthOffsetValue}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${monthOffsetValue}-${String(chosen).padStart(2, '0')}`;
}

/** Enrolment date, N months back, so billing periods look natural. */
function enrolledMonthsAgo(months) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
}

/**
 * Every month a student enrolled `ago` months ago has been billed for,
 * oldest first. Mirrors `billingPeriods` in fees.js.
 */
function billedSince(ago) {
  return Array.from({ length: ago + 1 }, (_, i) => monthOffset(-(ago - i)));
}

/**
 * Demo data for the in-memory driver. Lets the whole app run
 * (and be previewed) before a Supabase project exists.
 */
export function buildSeed() {
  const adminId = uid();
  const t1 = uid(); // Amina — Mathematics
  const t2 = uid(); // Youssef — Arabic
  const t3 = uid(); // Layla — English
  const p1 = uid(); // father of Sara & Omar
  const p2 = uid(); // mother of Lina

  const students = [
    { full_name: 'Sara Al-Mansouri', grade: 'Grade 4', section: 'A', monthly_fee: 350, ago: 3 },
    { full_name: 'Omar Al-Mansouri', grade: 'Grade 2', section: 'B', monthly_fee: 300, ago: 3 },
    { full_name: 'Lina Haddad', grade: 'Grade 5', section: 'A', monthly_fee: 350, ago: 4 },
    { full_name: 'Youssef Cherif', grade: 'Grade 3', section: 'C', monthly_fee: 320, ago: 2 },
    { full_name: 'Maya Bennani', grade: 'Grade 6', section: 'A', monthly_fee: 400, ago: 2 },
    { full_name: 'Adam Kabbaj', grade: 'Grade 1', section: 'B', monthly_fee: 280, ago: 2 },
  ].map(({ ago, ...s }) => ({
    id: uid(),
    photo_url: null,
    is_active: true,
    created_at: enrolledMonthsAgo(ago),
    ...s,
  }));

  const [sara, omar, lina, youssef, maya, adam] = students;

  /** One payment row, dated plausibly inside its month. */
  const pay = (student, period, amount, method) => ({
    id: uid(),
    student_id: student.id,
    period,
    amount,
    method,
    paid_on: dayIn(period, 4),
    note: null,
    recorded_by: adminId,
    created_at: new Date().toISOString(),
  });

  return {
    profiles: [
      {
        id: adminId,
        email: 'admin@brainybunch.school',
        password_hash: hashPassword('Admin#2026'),
        full_name: 'Nadia El Fassi',
        role: 'admin',
        job_title: 'School Director',
        phone: '+212 600 000 001',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: t1,
        email: 'amina@brainybunch.school',
        password_hash: hashPassword('Teach#2026'),
        full_name: 'Amina Benali',
        role: 'teacher',
        job_title: 'Mathematics',
        phone: '+212 600 000 002',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: t2,
        email: 'youssef@brainybunch.school',
        password_hash: hashPassword('Teach#2026'),
        full_name: 'Youssef Idrissi',
        role: 'teacher',
        job_title: 'Arabic Language',
        phone: '+212 600 000 003',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: t3,
        email: 'layla@brainybunch.school',
        password_hash: hashPassword('Teach#2026'),
        full_name: 'Layla Ouazzani',
        role: 'teacher',
        job_title: 'English',
        phone: '+212 600 000 004',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: p1,
        email: 'parent@brainybunch.school',
        password_hash: hashPassword('Parent#2026'),
        full_name: 'Hicham Al-Mansouri',
        role: 'parent',
        job_title: null,
        phone: '+212 600 000 005',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      {
        id: p2,
        email: 'sofia@brainybunch.school',
        password_hash: hashPassword('Parent#2026'),
        full_name: 'Sofia Haddad',
        role: 'parent',
        job_title: null,
        phone: '+212 600 000 006',
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
    sessions: [],
    students,
    teacher_students: [
      { teacher_id: t1, student_id: sara.id, subject: 'Mathematics' },
      { teacher_id: t1, student_id: omar.id, subject: 'Mathematics' },
      { teacher_id: t1, student_id: youssef.id, subject: 'Mathematics' },
      { teacher_id: t1, student_id: maya.id, subject: 'Mathematics' },
      { teacher_id: t1, student_id: adam.id, subject: 'Mathematics' },
      { teacher_id: t2, student_id: sara.id, subject: 'Arabic' },
      { teacher_id: t2, student_id: omar.id, subject: 'Arabic' },
      { teacher_id: t2, student_id: lina.id, subject: 'Arabic' },
      { teacher_id: t3, student_id: lina.id, subject: 'English' },
      { teacher_id: t3, student_id: maya.id, subject: 'English' },
    ],
    guardians: [
      { parent_id: p1, student_id: sara.id, relation: 'father' },
      { parent_id: p1, student_id: omar.id, relation: 'father' },
      { parent_id: p2, student_id: lina.id, relation: 'mother' },
    ],
    notes: [
      {
        id: uid(),
        student_id: sara.id,
        teacher_id: t1,
        kind: 'praise',
        body: 'Excellent work on fractions this week. Sara solved every challenge without help and explained her reasoning clearly to the class.',
        is_shared: true,
        created_at: new Date(Date.now() - 6 * 864e5).toISOString(),
      },
      {
        id: uid(),
        student_id: sara.id,
        teacher_id: t2,
        kind: 'recommendation',
        body: 'Recommended for the reading club. Her comprehension and vocabulary are well above the grade level.',
        is_shared: true,
        created_at: new Date(Date.now() - 15 * 864e5).toISOString(),
      },
      {
        id: uid(),
        student_id: omar.id,
        teacher_id: t1,
        kind: 'concern',
        body: 'Needs attention: Omar still mixes up borrowing in subtraction. Please practise 10 minutes a day at home, then send him back with confidence.',
        is_shared: true,
        created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
      },
      {
        id: uid(),
        student_id: lina.id,
        teacher_id: t3,
        kind: 'recommendation',
        body: 'Lina writes beautifully. I suggest moving her up one level in the advanced English group.',
        is_shared: true,
        created_at: new Date(Date.now() - 9 * 864e5).toISOString(),
      },
      {
        id: uid(),
        student_id: maya.id,
        teacher_id: t1,
        kind: 'recommendation',
        body: 'Strong candidate for the maths olympiad preparation. Reliable and self-motivated.',
        is_shared: false,
        created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
      },
    ],
    // A deliberately mixed picture, so every badge state is visible:
    // fully settled, current month due, arrears, and a part payment.
    // A student is billed from their enrolment month, so a "settled"
    // student has paid every month in billedSince().
    payments: [
      // Sara — settled for every month she has been enrolled
      ...billedSince(3).map((p) => pay(sara, p, 350, 'transfer')),
      // Omar — settled except this month (unpaid, no arrears)
      ...billedSince(3).slice(0, -1).map((p) => pay(omar, p, 300, 'cash')),
      // Lina — settled for her whole time here
      ...billedSince(4).map((p) => pay(lina, p, 350, 'online')),
      // Youssef — fell behind, nothing paid since enrolment
      pay(youssef, billedSince(2)[0], 320, 'cheque'),
      // Maya — settled until this month, then paid only part of it
      ...billedSince(2).slice(0, -1).map((p) => pay(maya, p, 400, 'transfer')),
      pay(maya, billedSince(2).at(-1), 150, 'cash'),
      // Adam — settled
      ...billedSince(2).map((p) => pay(adam, p, 280, 'cash')),
    ],
    announcements: [
      {
        id: uid(),
        body_ar: 'مرحباً بكم في عام دراسي جديد — تمنياتنا لكم بالتوفيق 🌿',
        body_en: 'Welcome to a new school year — wishing you every success 🌿',
        tone: 'green',
        is_active: true,
        sort_order: 1,
      },
      {
        id: uid(),
        body_ar: 'آخر موعد لتسديد رسوم شهر نوفمبر هو اليوم 15 من الشهر',
        body_en: 'November tuition is due by the 15th of the month',
        tone: 'red',
        is_active: true,
        sort_order: 2,
      },
      {
        id: uid(),
        body_ar: 'اجتماع أولياء الأمور يوم الخميس القادم الساعة الخامسة مساءً',
        body_en: 'Parents meeting next Thursday at 5:00 PM',
        tone: 'neutral',
        is_active: true,
        sort_order: 3,
      },
    ],
  };
}
