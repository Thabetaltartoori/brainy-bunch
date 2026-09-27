import { Router } from 'express';

import { canAccessStudent, loadVisibleStudents } from '../access.js';
import { forbidden, notFound, requireRole, route, v } from '../http.js';

const KINDS = ['recommendation', 'praise', 'concern'];

/** A teacher may only write about their own students; admins may write for anyone. */
async function assertCanWriteNote(store, user, studentId) {
  if (user.role === 'admin') return;
  if (user.role === 'teacher') {
    if (await canAccessStudent(store, user, studentId)) return;
    throw forbidden('You are not assigned to this student');
  }
  throw forbidden('Parents cannot add notes');
}

export function noteRoutes(store) {
  const r = Router();

  /**
   * Every note this user is allowed to see, newest first.
   *   admin   -> all notes
   *   teacher -> notes about their own students (incl. internal ones)
   *   parent  -> only shared notes about their children
   */
  r.get(
    '/',
    route(async (req, res) => {
      const [visibleStudents, users] = await Promise.all([
        loadVisibleStudents(store, req.user),
        store.listUsers({}),
      ]);

      const allowed = new Set(visibleStudents.map((s) => s.id));
      const names = new Map(visibleStudents.map((s) => [s.id, s.full_name]));
      const nameOf = (id) => users.find((u) => u.id === id)?.full_name ?? '—';

      const all = await store.listNotes({});
      const notes = all
        .filter((n) => allowed.has(n.student_id))
        .filter((n) => (req.user.role === 'parent' ? n.is_shared : true))
        .map((n) => ({
          ...n,
          student_name: names.get(n.student_id) ?? '—',
          teacher_name: nameOf(n.teacher_id),
        }));

      res.json({ notes });
    }),
  );

  r.post(
    '/',
    requireRole('teacher', 'admin'),
    route(async (req, res) => {
      const studentId = v.str(req.body?.student_id, 'student_id', { max: 80 });
      await assertCanWriteNote(store, req.user, studentId);
      if (!(await store.getStudentById(studentId))) throw notFound('Student not found');

      const note = await store.createNote({
        student_id: studentId,
        teacher_id: req.user.id,
        kind: v.oneOf(req.body?.kind, 'kind', KINDS),
        body: v.str(req.body?.body, 'body', { max: 2000 }),
        is_shared: v.bool(req.body?.is_shared, true),
      });

      res.status(201).json({ note });
    }),
  );

  r.patch(
    '/:id',
    requireRole('teacher', 'admin'),
    route(async (req, res) => {
      const existing = (await store.listNotes({})).find((n) => n.id === req.params.id);
      if (!existing) throw notFound('Note not found');
      await assertCanWriteNote(store, req.user, existing.student_id);
      // Teachers can only edit their own notes; admins can edit any.
      if (req.user.role === 'teacher' && existing.teacher_id !== req.user.id) {
        throw forbidden('You can only edit your own notes');
      }

      const patch = {};
      if (req.body?.kind !== undefined) patch.kind = v.oneOf(req.body.kind, 'kind', KINDS);
      if (req.body?.body !== undefined) patch.body = v.str(req.body.body, 'body', { max: 2000 });
      if (req.body?.is_shared !== undefined) patch.is_shared = v.bool(req.body.is_shared);

      res.json({ note: await store.updateNote(req.params.id, patch) });
    }),
  );

  r.delete(
    '/:id',
    requireRole('teacher', 'admin'),
    route(async (req, res) => {
      const existing = (await store.listNotes({})).find((n) => n.id === req.params.id);
      if (!existing) throw notFound('Note not found');
      await assertCanWriteNote(store, req.user, existing.student_id);
      if (req.user.role === 'teacher' && existing.teacher_id !== req.user.id) {
        throw forbidden('You can only delete your own notes');
      }
      await store.deleteNote(req.params.id);
      res.json({ ok: true });
    }),
  );

  return r;
}
