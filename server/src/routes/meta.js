import { Router } from 'express';

import { loadVisibleStudents } from '../access.js';
import { currentPeriod } from '../fees.js';
import { notFound, requireRole, route, v } from '../http.js';

export function metaRoutes(store) {
  const r = Router();

  // ---- banner messages for the dynamic top label ----
  r.get(
    '/announcements',
    route(async (_req, res) => {
      res.json({ announcements: await store.listAnnouncements({ activeOnly: true }) });
    }),
  );

  r.post(
    '/announcements',
    requireRole('admin'),
    route(async (req, res) => {
      const announcement = await store.createAnnouncement({
        body_ar: v.str(req.body?.body_ar, 'body_ar', { max: 300 }),
        body_en: v.str(req.body?.body_en, 'body_en', { max: 300 }),
        tone: v.oneOf(req.body?.tone, 'tone', ['green', 'red', 'neutral'], {
          required: false,
          fallback: 'green',
        }),
        is_active: v.bool(req.body?.is_active, true),
        sort_order: v.num(req.body?.sort_order, 'sort_order', { min: 0, max: 999 }),
      });
      res.status(201).json({ announcement });
    }),
  );

  r.patch(
    '/announcements/:id',
    requireRole('admin'),
    route(async (req, res) => {
      const patch = {};
      if (req.body?.body_ar !== undefined)
        patch.body_ar = v.str(req.body.body_ar, 'body_ar', { max: 300 });
      if (req.body?.body_en !== undefined)
        patch.body_en = v.str(req.body.body_en, 'body_en', { max: 300 });
      if (req.body?.tone !== undefined)
        patch.tone = v.oneOf(req.body.tone, 'tone', ['green', 'red', 'neutral']);
      if (req.body?.is_active !== undefined) patch.is_active = v.bool(req.body.is_active);
      res.json({ announcement: await store.updateAnnouncement(req.params.id, patch) });
    }),
  );

  r.delete(
    '/announcements/:id',
    requireRole('admin'),
    route(async (req, res) => {
      await store.deleteAnnouncement(req.params.id);
      res.json({ ok: true });
    }),
  );

  // ---- dashboard figures, scoped to whatever this user may see ----
  r.get(
    '/stats',
    route(async (req, res) => {
      const students = await loadVisibleStudents(store, req.user);
      const period = currentPeriod();

      const notes = await store.listNotes({});
      const visibleIds = new Set(students.map((s) => s.id));
      const myNotes = notes
        .filter((n) => visibleIds.has(n.student_id))
        .filter((n) => (req.user.role === 'parent' ? n.is_shared : true));

      const byGrade = {};
      for (const s of students) {
        byGrade[s.grade] = (byGrade[s.grade] ?? 0) + 1;
      }

      const collectedThisMonth = students
        .filter((s) => s.feeSummary.paidPeriods.has(period))
        .reduce((sum, s) => sum + Number(s.feeSummary.paidPeriods.get(period).amount ?? 0), 0);

      res.json({
        period,
        totalStudents: students.length,
        totalActive: students.filter((s) => s.is_active).length,
        paidThisMonth: students.filter((s) => s.feeSummary.currentStatus === 'paid').length,
        unpaidThisMonth: students.filter((s) => s.feeSummary.currentStatus !== 'paid').length,
        overdueCount: students.filter((s) => s.feeSummary.overdueCount > 0).length,
        totalExpected: students.reduce((sum, s) => sum + s.feeSummary.expected, 0),
        totalCollected: students.reduce((sum, s) => sum + s.feeSummary.paid, 0),
        totalOutstanding: students.reduce((sum, s) => sum + s.feeSummary.balance, 0),
        collectedThisMonth,
        noteCount: myNotes.length,
        sharedNoteCount: myNotes.filter((n) => n.is_shared).length,
        concernCount: myNotes.filter((n) => n.kind === 'concern').length,
        byGrade: Object.entries(byGrade)
          .map(([grade, count]) => ({ grade, count }))
          .sort((a, b) => a.grade.localeCompare(b.grade)),
        recentNotes: myNotes.slice(0, 5).map((n) => ({
          ...n,
          student_name: students.find((s) => s.id === n.student_id)?.full_name ?? '—',
        })),
      });
    }),
  );

  return r;
}
