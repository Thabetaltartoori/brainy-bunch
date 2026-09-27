import { Router } from 'express';

import { canAccessStudent, loadVisibleStudents } from '../access.js';
import { summarizeFees } from '../fees.js';
import { badRequest, forbidden, notFound, requireRole, route, v } from '../http.js';

export function studentRoutes(store) {
  const r = Router();

  // ---- list (already filtered to what this user may see) ----
  r.get(
    '/',
    route(async (req, res) => {
      const students = await loadVisibleStudents(store, req.user);
      const { grade, status, q } = req.query;

      const filtered = students.filter((s) => {
        if (grade && grade !== 'all' && s.grade !== grade) return false;
        if (
          q &&
          !`${s.full_name} ${s.grade} ${s.section ?? ''}`
            .toLowerCase()
            .includes(String(q).toLowerCase())
        )
          return false;
        if (status === 'unpaid' && s.feeSummary.currentStatus !== 'unpaid') return false;
        if (status === 'overdue' && s.feeSummary.overdueCount === 0) return false;
        if (status === 'settled' && s.feeSummary.balance > 0) return false;
        if (status === 'inactive' && s.is_active) return false;
        return true;
      });

      res.json({ students: filtered });
    }),
  );

  // ---- one student, with their notes and payment history ----
  r.get(
    '/:id',
    route(async (req, res) => {
      const { id } = req.params;
      if (!(await canAccessStudent(store, req.user, id))) throw forbidden();

      const student = await store.getStudentById(id);
      if (!student) throw notFound('Student not found');

      const [notes, payments, teacherLinks, guardianLinks, users] = await Promise.all([
        store.listNotes({ studentId: id }),
        store.listPayments({ studentId: id }),
        store.listAllTeacherStudents(),
        store.listGuardians(),
        store.listUsers({}),
      ]);
      const nameOf = (uid) => users.find((u) => u.id === uid)?.full_name ?? '—';

      // Parents only ever see notes a teacher chose to share.
      const visibleNotes = (
        req.user.role === 'parent' ? notes.filter((n) => n.is_shared) : notes
      ).map((n) => ({ ...n, teacher_name: nameOf(n.teacher_id) }));

      res.json({
        student: {
          ...student,
          teachers: teacherLinks
            .filter((l) => l.student_id === id)
            .map((l) => ({ id: l.teacher_id, name: nameOf(l.teacher_id), subject: l.subject })),
          guardians: guardianLinks
            .filter((l) => l.student_id === id)
            .map((l) => ({ id: l.parent_id, name: nameOf(l.parent_id), relation: l.relation })),
          payments: payments.map((p) => ({
            ...p,
            recorded_by_name: nameOf(p.recorded_by),
          })),
          feeSummary: summarizeFees(student, payments),
        },
        notes: visibleNotes,
      });
    }),
  );

  // ---- create ----
  r.post(
    '/',
    requireRole('admin'),
    route(async (req, res) => {
      const student = await store.createStudent({
        full_name: v.str(req.body?.full_name, 'full_name', { max: 120 }),
        grade: v.str(req.body?.grade, 'grade', { max: 40 }),
        section: v.str(req.body?.section, 'section', { required: false, max: 40, fallback: null }),
        monthly_fee: v.num(req.body?.monthly_fee, 'monthly_fee', { min: 0, max: 100000 }),
        is_active: v.bool(req.body?.is_active, true),
      });
      res.status(201).json({ student });
    }),
  );

  // ---- update ----
  r.patch(
    '/:id',
    requireRole('admin'),
    route(async (req, res) => {
      const patch = {};
      if (req.body?.full_name !== undefined)
        patch.full_name = v.str(req.body.full_name, 'full_name', { max: 120 });
      if (req.body?.grade !== undefined)
        patch.grade = v.str(req.body.grade, 'grade', { max: 40 });
      if (req.body?.section !== undefined)
        patch.section = v.str(req.body.section, 'section', {
          required: false,
          max: 40,
          fallback: null,
        });
      if (req.body?.monthly_fee !== undefined)
        patch.monthly_fee = v.num(req.body.monthly_fee, 'monthly_fee', { min: 0, max: 100000 });
      if (req.body?.is_active !== undefined) patch.is_active = v.bool(req.body.is_active);
      if (!Object.keys(patch).length) throw badRequest('Nothing to update');

      res.json({ student: await store.updateStudent(req.params.id, patch) });
    }),
  );

  // ---- delete (cascades notes, payments and links) ----
  r.delete(
    '/:id',
    requireRole('admin'),
    route(async (req, res) => {
      await store.deleteStudent(req.params.id);
      res.json({ ok: true });
    }),
  );

  // ---- link / unlink a teacher ----
  r.post(
    '/:id/teachers',
    requireRole('admin'),
    route(async (req, res) => {
      const teacherId = v.str(req.body?.teacher_id, 'teacher_id', { max: 80 });
      const teacher = await store.getUserById(teacherId);
      if (!teacher || teacher.role !== 'teacher') throw badRequest('That user is not a teacher');
      if (!(await store.getStudentById(req.params.id))) throw notFound('Student not found');
      const subject = v.str(req.body?.subject, 'subject', {
        required: false,
        max: 60,
        fallback: null,
      });
      await store.linkTeacherStudent(teacherId, req.params.id, subject ?? teacher.job_title);
      res.status(201).json({ ok: true });
    }),
  );

  r.delete(
    '/:id/teachers/:teacherId',
    requireRole('admin'),
    route(async (req, res) => {
      if (!(await store.getStudentById(req.params.id))) throw notFound('Student not found');
      await store.unlinkTeacherStudent(req.params.teacherId, req.params.id);
      res.json({ ok: true });
    }),
  );

  // ---- link / unlink a guardian ----
  r.post(
    '/:id/guardians',
    requireRole('admin'),
    route(async (req, res) => {
      const parentId = v.str(req.body?.parent_id, 'parent_id', { max: 80 });
      const parent = await store.getUserById(parentId);
      if (!parent || parent.role !== 'parent') throw badRequest('That user is not a parent');
      if (!(await store.getStudentById(req.params.id))) throw notFound('Student not found');
      const relation = v.str(req.body?.relation, 'relation', {
        required: false,
        max: 40,
        fallback: null,
      });
      await store.linkGuardian(parentId, req.params.id, relation);
      res.status(201).json({ ok: true });
    }),
  );

  r.delete(
    '/:id/guardians/:parentId',
    requireRole('admin'),
    route(async (req, res) => {
      if (!(await store.getStudentById(req.params.id))) throw notFound('Student not found');
      await store.unlinkGuardian(req.params.parentId, req.params.id);
      res.json({ ok: true });
    }),
  );

  return r;
}
