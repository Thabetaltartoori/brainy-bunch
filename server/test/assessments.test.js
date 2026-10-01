import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';

import { assessmentRoutes } from '../src/routes/assessments.js';
import { studentRoutes } from '../src/routes/students.js';
import { MemoryStore } from '../src/store/memory.js';

test('assessment writes require teacher assignment and valid shared scores', async (t) => {
  const store = new MemoryStore();
  const teacher = store.db.profiles.find((user) => user.role === 'teacher');
  const parent = store.db.profiles.find((user) => user.role === 'parent');
  const assigned = store.db.students[0];
  const unassigned = store.db.students.find(
    (student) =>
      (student.grade !== assigned.grade || student.section !== assigned.section) &&
      !store.db.teacher_students.some(
        (link) => link.teacher_id === teacher.id && link.student_id === student.id,
      ),
  );
  assert.ok(unassigned);

  await store.replaceTeacherSections(teacher.id, [
    { grade: assigned.grade, section: assigned.section },
  ]);

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = req.get('x-test-parent') ? parent : teacher;
    next();
  });
  app.use('/api/students', studentRoutes(store));
  app.use('/api/assessments', assessmentRoutes(store));
  app.use((err, _req, res, _next) => res.status(err.status ?? 500).json({ error: err.message }));

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}/api/assessments`;
  const body = {
    student_id: assigned.id,
    subject: 'Math',
    test_name: 'Unit 1',
    test_date: '2026-10-01',
    score: 16,
    max_score: 20,
  };
  const post = (payload, headers = {}) =>
    fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(payload),
    });

  assert.equal((await post(body)).status, 201);
  assert.equal((await post({ ...body, student_id: unassigned.id })).status, 403);
  assert.equal((await post({ ...body, score: 21 })).status, 400);
  assert.equal((await post({ ...body, test_date: '2026-02-30' })).status, 400);
  assert.equal((await post(body, { 'x-test-parent': '1' })).status, 403);
  assert.equal((await store.listAssessments({ studentId: assigned.id })).length, 1);

  await store.linkGuardian(parent.id, assigned.id, 'parent');
  const parentRequest = (studentId) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/students/${studentId}`, {
      headers: { 'x-test-parent': '1' },
    });
  const visibleStudent = await parentRequest(assigned.id);
  const hiddenStudent = await parentRequest(unassigned.id);
  assert.equal(visibleStudent.status, 200);
  assert.equal((await visibleStudent.json()).assessments.length, 1);
  assert.equal(hiddenStudent.status, 403);
});