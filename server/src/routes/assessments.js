import { Router } from 'express';

import { canAccessStudent } from '../access.js';
import { badRequest, forbidden, notFound, requireRole, route, unavailable, v } from '../http.js';

export function assessmentRoutes(store) {
  const r = Router();

  r.post(
    '/',
    requireRole('teacher', 'admin'),
    route(async (req, res) => {
      const studentId = v.str(req.body?.student_id, 'student_id', { max: 80 });
      if (!(await canAccessStudent(store, req.user, studentId))) {
        throw forbidden('You are not assigned to this student');
      }
      if (!(await store.getStudentById(studentId))) throw notFound('Student not found');

      const testDate = v.str(req.body?.test_date, 'test_date', { max: 10 });
      const parsedDate = new Date(`${testDate}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(testDate) ||
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== testDate
      ) {
        throw badRequest('"test_date" must be a valid YYYY-MM-DD date');
      }

      const score = v.num(req.body?.score, 'score', { max: 99999.99 });
      const maxScore = v.num(req.body?.max_score, 'max_score', { min: 0.01, max: 99999.99 });
      if (score > maxScore) throw badRequest('"score" cannot exceed "max_score"');

      const assessment = await store
        .createAssessment({
          student_id: studentId,
          teacher_id: req.user.id,
          subject: v.str(req.body?.subject, 'subject', { max: 80 }),
          test_name: v.str(req.body?.test_name, 'test_name', { max: 120 }),
          test_date: testDate,
          score,
          max_score: maxScore,
        })
        .catch((err) => {
          if (err?.code === 'ASSESSMENTS_TABLE_MISSING') throw unavailable(err.message, err.code);
          throw err;
        });

      res.status(201).json({ assessment });
    }),
  );

  return r;
}