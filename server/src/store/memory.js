import { buildSeed } from './seed.js';

const now = () => new Date().toISOString();
const byKey = (rows, key) => (v) => rows.find((r) => r[key] === v);

/**
 * In-memory driver. Same interface as SupabaseStore, backed by
 * plain arrays. Data resets whenever the server restarts — it exists
 * so the app can be run and previewed before Supabase is connected.
 */
export class MemoryStore {
  constructor() {
    this.db = buildSeed();
    this.driver = 'memory';
  }

  async init() {
    /* nothing to migrate */
  }

  // ---------- profiles ----------
  async findUserByEmail(email) {
    const needle = String(email).trim().toLowerCase();
    return (
      this.db.profiles.find((p) => p.email.toLowerCase() === needle) ?? null
    );
  }

  async getUserById(id) {
    return byKey(this.db.profiles, 'id')(id) ?? null;
  }

  async listUsers({ role } = {}) {
    const rows = role
      ? this.db.profiles.filter((p) => p.role === role)
      : this.db.profiles;
    return [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  async createUser(row) {
    const clash = await this.findUserByEmail(row.email);
    if (clash) throw new Error('A user with this email already exists');
    const rec = { id: crypto.randomUUID(), is_active: true, created_at: now(), ...row };
    this.db.profiles.push(rec);
    return rec;
  }

  async updateUser(id, patch) {
    const rec = await this.getUserById(id);
    if (!rec) throw new Error('User not found');
    Object.assign(rec, patch);
    return rec;
  }

  async deleteUser(id) {
    const i = this.db.profiles.findIndex((p) => p.id === id);
    if (i < 0) throw new Error('User not found');
    this.db.profiles.splice(i, 1);
  }

  // ---------- sessions ----------
  async createSession(token, userId, expiresAt) {
    this.db.sessions.push({ token, user_id: userId, expires_at: expiresAt, created_at: now() });
  }

  async getSessionUser(token) {
    const s = byKey(this.db.sessions, 'token')(token);
    if (!s) return null;
    if (new Date(s.expires_at).getTime() < Date.now()) {
      await this.deleteSession(token);
      return null;
    }
    return this.getUserById(s.user_id);
  }

  async deleteSession(token) {
    const i = this.db.sessions.findIndex((s) => s.token === token);
    if (i >= 0) this.db.sessions.splice(i, 1);
  }

  async deleteSessionsForUser(userId) {
    this.db.sessions = this.db.sessions.filter((s) => s.user_id !== userId);
  }

  // ---------- announcements ----------
  async listAnnouncements({ activeOnly = true } = {}) {
    const rows = activeOnly
      ? this.db.announcements.filter((a) => a.is_active)
      : this.db.announcements;
    return [...rows].sort((a, b) => a.sort_order - b.sort_order);
  }

  async createAnnouncement(row) {
    const rec = { id: crypto.randomUUID(), is_active: true, sort_order: 0, ...row };
    this.db.announcements.push(rec);
    return rec;
  }

  async updateAnnouncement(id, patch) {
    const rec = byKey(this.db.announcements, 'id')(id);
    if (!rec) throw new Error('Announcement not found');
    Object.assign(rec, patch);
    return rec;
  }

  async deleteAnnouncement(id) {
    const i = this.db.announcements.findIndex((a) => a.id === id);
    if (i >= 0) this.db.announcements.splice(i, 1);
  }

  // ---------- students ----------
  async listStudents() {
    return [...this.db.students].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  async getStudentById(id) {
    return byKey(this.db.students, 'id')(id) ?? null;
  }

  async createStudent(row) {
    const rec = {
      id: crypto.randomUUID(),
      photo_url: null,
      is_active: true,
      created_at: now(),
      monthly_fee: 0,
      ...row,
    };
    this.db.students.push(rec);
    return rec;
  }

  async updateStudent(id, patch) {
    const rec = await this.getStudentById(id);
    if (!rec) throw new Error('Student not found');
    Object.assign(rec, patch);
    return rec;
  }

  async deleteStudent(id) {
    const i = this.db.students.findIndex((s) => s.id === id);
    if (i < 0) throw new Error('Student not found');
    this.db.students.splice(i, 1);
    // cascade links and records
    this.db.teacher_students = this.db.teacher_students.filter((l) => l.student_id !== id);
    this.db.guardians = this.db.guardians.filter((l) => l.student_id !== id);
    this.db.notes = this.db.notes.filter((n) => n.student_id !== id);
    this.db.payments = this.db.payments.filter((p) => p.student_id !== id);
  }

  // ---------- links ----------
  async listTeacherStudents(teacherId) {
    return this.db.teacher_students.filter((l) => l.teacher_id === teacherId);
  }

  async listAllTeacherStudents() {
    return this.db.teacher_students;
  }

  async linkTeacherStudent(teacherId, studentId, subject) {
    const existing = this.db.teacher_students.find(
      (l) => l.teacher_id === teacherId && l.student_id === studentId,
    );
    if (existing) existing.subject = subject;
    else this.db.teacher_students.push({ teacher_id: teacherId, student_id: studentId, subject });
  }

  async unlinkTeacherStudent(teacherId, studentId) {
    this.db.teacher_students = this.db.teacher_students.filter(
      (l) => !(l.teacher_id === teacherId && l.student_id === studentId),
    );
  }

  async listGuardians() {
    return this.db.guardians;
  }

  async linkGuardian(parentId, studentId, relation) {
    const existing = this.db.guardians.find(
      (l) => l.parent_id === parentId && l.student_id === studentId,
    );
    if (existing) existing.relation = relation;
    else this.db.guardians.push({ parent_id: parentId, student_id: studentId, relation });
  }

  async unlinkGuardian(parentId, studentId) {
    this.db.guardians = this.db.guardians.filter(
      (l) => !(l.parent_id === parentId && l.student_id === studentId),
    );
  }

  // ---------- notes ----------
  async listNotes({ studentId } = {}) {
    const rows = studentId
      ? this.db.notes.filter((n) => n.student_id === studentId)
      : this.db.notes;
    return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async createNote(row) {
    const rec = { id: crypto.randomUUID(), is_shared: true, created_at: now(), ...row };
    this.db.notes.push(rec);
    return rec;
  }

  async updateNote(id, patch) {
    const rec = byKey(this.db.notes, 'id')(id);
    if (!rec) throw new Error('Note not found');
    Object.assign(rec, patch);
    return rec;
  }

  async deleteNote(id) {
    const i = this.db.notes.findIndex((n) => n.id === id);
    if (i < 0) throw new Error('Note not found');
    this.db.notes.splice(i, 1);
  }

  // ---------- payments ----------
  async listPayments({ studentId } = {}) {
    const rows = studentId
      ? this.db.payments.filter((p) => p.student_id === studentId)
      : this.db.payments;
    return [...rows].sort((a, b) => b.period.localeCompare(a.period));
  }

  async upsertPayment(row) {
    const existing = this.db.payments.find(
      (p) => p.student_id === row.student_id && p.period === row.period,
    );
    if (existing) {
      Object.assign(existing, row);
      return existing;
    }
    const rec = { id: crypto.randomUUID(), created_at: now(), ...row };
    this.db.payments.push(rec);
    return rec;
  }

  async deletePayment(id) {
    const i = this.db.payments.findIndex((p) => p.id === id);
    if (i < 0) throw new Error('Payment not found');
    this.db.payments.splice(i, 1);
  }
}
