import { summarizeFees } from './fees.js';

/**
 * Who can see what.
 *
 *   admin   -> every student
 *   teacher -> only students linked to them in `teacher_students`
 *   parent  -> only students linked to them in `guardians`
 *
 * This module is the single gate. Routes call it and trust the result,
 * so a row is never served without a server-side check.
 */

/** null means "no restriction" (admin). */
export async function visibleStudentIds(store, user) {
  if (user.role === 'admin') return null;
  if (user.role === 'teacher') {
    const links = await store.listTeacherStudents(user.id);
    return new Set(links.map((l) => l.student_id));
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
