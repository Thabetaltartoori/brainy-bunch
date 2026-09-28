import { summarizeFees } from './fees.js';

/**
 * Who can see what.
 *
 *   admin   -> every student
 *   teacher -> students in the sections assigned to them, plus any linked
 *              individually in `teacher_students`
 *   parent  -> only students linked to them in `guardians`
 *
 * Sections and individual links are combined rather than one replacing the
 * other. A section is the convenient way to hand a teacher a whole class at
 * once, while a link still covers the one-off case (a substitute covering a
 * single student). Combining them also means assigning a section can never
 * silently *reduce* what a teacher already had access to.
 *
 * This module is the single gate. Routes call it and trust the result,
 * so a row is never served without a server-side check.
 */

/**
 * Composite key for a class. JSON encoding rather than a delimiter join,
 * because a grade or section is free text and a delimiter inside one would
 * silently let two different classes compare equal - and this key decides who
 * can see which student.
 */
export const classKey = (grade, section) => JSON.stringify([grade, section]);

/** null means "no restriction" (admin). */
export async function visibleStudentIds(store, user) {
  if (user.role === 'admin') return null;
  if (user.role === 'teacher') {
    const [links, sections, students] = await Promise.all([
      store.listTeacherStudents(user.id),
      store.listTeacherSections(user.id),
      store.listStudents(),
    ]);
    const classes = new Set(sections.map((s) => classKey(s.grade, s.section)));
    const ids = new Set(links.map((l) => l.student_id));
    for (const student of students) {
      if (classes.has(classKey(student.grade, student.section))) ids.add(student.id);
    }
    return ids;
  }
  if (user.role === 'parent') {
    const links = await store.listGuardians();
    return new Set(links.filter((l) => l.parent_id === user.id).map((l) => l.student_id));
  }
  return new Set();
}

export async function canAccessStudent(store, user, studentId) {
  const ids = await visibleStudentIds(store, user);
  return ids === null || ids.has(studentId);
}

/** Strip anything a client should never receive. */
export function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * Load every student the user is allowed to see, already enriched with
 * fee summary, linked teachers/guardians and shared-note counts.
 */
export async function loadVisibleStudents(store, user) {
  const [allowed, payments, notes, teacherLinks, guardianLinks, users] = await Promise.all([
    visibleStudentIds(store, user),
    store.listPayments({}),
    store.listNotes({}),
    store.listAllTeacherStudents(),
    store.listGuardians(),
    store.listUsers({}),
  ]);

  const nameOf = (id) => users.find((u) => u.id === id)?.full_name ?? '—';
  const all = await store.listStudents();

  return all
    .filter((s) => allowed === null || allowed.has(s.id))
    .map((student) => {
      const mine = payments.filter((p) => p.student_id === student.id);
      return {
        ...student,
        feeSummary: summarizeFees(student, mine),
        teachers: teacherLinks
          .filter((l) => l.student_id === student.id)
          .map((l) => ({ id: l.teacher_id, name: nameOf(l.teacher_id), subject: l.subject })),
        guardians: guardianLinks
          .filter((l) => l.student_id === student.id)
          .map((l) => ({ id: l.parent_id, name: nameOf(l.parent_id), relation: l.relation })),
        noteCount: notes.filter((n) => n.student_id === student.id && n.is_shared).length,
      };
    });
}
