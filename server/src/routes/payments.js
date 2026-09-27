import { Router } from 'express';

import { canAccessStudent } from '../access.js';
import { badRequest, forbidden, notFound, requireRole, route, v } from '../http.js';

const METHODS = ['cash', 'transfer', 'online', 'cheque'];
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function paymentRoutes(store) {
  const r = Router();

  /**
   * Record (or correct) a payment for one student-month.
   * Upsert semantics: posting the same month again updates it rather
   * than creating a duplicate, so a mistyped amount is easy to fix.
   */
  r.post(
    '/',
    requireRole('admin'),
    route(async (req, res) => {
      const studentId = v.str(req.body?.student_id, 'student_id', { max: 80 });
      const student = await store.getStudentById(studentId);
      if (!student) throw notFound('Student not found');

      const period = v.str(req.body?.period, 'period', { max: 7 });
      if (!PERIOD_RE.test(period)) throw badRequest('"period" must look like 2026-10');

      const paidOn = v.str(req.body?.paid_on, 'paid_on', { required: false, max: 10, fallback: null });
      if (paidOn && !/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) {
        throw badRequest('"paid_on" must look like 2026-10-05');
      }

      const payment = await store.upsertPayment({
        student_id: studentId,
        period,
        amount: v.num(req.body?.amount, 'amount', { min: 0, max: 100000 }),
        method: v.oneOf(req.body?.method, 'method', METHODS, { required: false, fallback: 'cash' }),
        paid_on: paidOn,
        note: v.str(req.body?.note, 'note', { required: false, max: 300, fallback: null }),
        recorded_by: req.user.id,
      });

      res.status(201).json({ payment });
    }),
  );

  r.delete(
    '/:id',
    requireRole('admin'),
    route(async (req, res) => {
      const existing = (await store.listPayments({})).find((p) => p.id === req.params.id);
      if (!existing) throw notFound('Payment not found');
      await store.deletePayment(existing.id);
      res.json({ ok: true });
    }),
  );

  /** Everyone keeps read access to their own child's payment history. */
  r.get(
    '/',
    route(async (req, res) => {
      const studentId = v.str(req.query?.student_id, 'student_id', { max: 80 });
      if (!(await canAccessStudent(store, req.user, studentId))) throw forbidden();
      res.json({ payments: await store.listPayments({ studentId }) });
    }),
  );

  return r;
}
