import { createClient } from '@supabase/supabase-js';

/**
 * Supabase (Postgres) driver.
 * Every method here has an identical signature to MemoryStore,
 * so the routes never know which one is live.
 */
export class SupabaseStore {
  constructor(url, key) {
    this.db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.driver = 'supabase';
  }

  async init() {
    // Fail fast with a clear message if the project is unreachable.
    const { error } = await this.db.from('announcements').select('id').limit(1);
    if (error) throw new Error(`Supabase unreachable: ${error.message}`);
  }

  // ---------- profiles ----------
  async findUserByEmail(email) {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .ilike('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getUserById(id) {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listUsers({ role } = {}) {
    let q = this.db.from('profiles').select('*').order('full_name');
    if (role) q = q.eq('role', role);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async createUser(row) {
    const { data, error } = await this.db
      .from('profiles')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateUser(id, patch) {
    const { data, error } = await this.db
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteUser(id) {
    const { error } = await this.db.from('profiles').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- sessions ----------
  async createSession(token, userId, expiresAt) {
    const { error } = await this.db
      .from('sessions')
      .insert({ token, user_id: userId, expires_at: expiresAt });
    if (error) throw error;
  }

  async getSessionUser(token) {
    const { data, error } = await this.db
      .from('sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (new Date(data.expires_at).getTime() < Date.now()) {
      await this.deleteSession(token);
      return null;
    }
    return this.getUserById(data.user_id);
  }

  async deleteSession(token) {
    const { error } = await this.db.from('sessions').delete().eq('token', token);
    if (error) throw error;
  }

  async deleteSessionsForUser(userId) {
    const { error } = await this.db.from('sessions').delete().eq('user_id', userId);
    if (error) throw error;
  }

  // ---------- announcements ----------
  async listAnnouncements({ activeOnly = true } = {}) {
    let q = this.db.from('announcements').select('*').order('sort_order');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async createAnnouncement(row) {
    const { data, error } = await this.db
      .from('announcements')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateAnnouncement(id, patch) {
    const { data, error } = await this.db
      .from('announcements')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteAnnouncement(id) {
    const { error } = await this.db.from('announcements').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- students ----------
  async listStudents() {
    const { data, error } = await this.db
      .from('students')
      .select('*')
      .order('full_name');
    if (error) throw error;
    return data;
  }

  async getStudentById(id) {
    const { data, error } = await this.db
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async createStudent(row) {
    const { data, error } = await this.db
      .from('students')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateStudent(id, patch) {
    const { data, error } = await this.db
      .from('students')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteStudent(id) {
    const { error } = await this.db.from('students').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- links ----------
  async listTeacherStudents(teacherId) {
    const { data, error } = await this.db
      .from('teacher_students')
      .select('*')
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return data;
  }

  async listAllTeacherStudents() {
    const { data, error } = await this.db.from('teacher_students').select('*');
    if (error) throw error;
    return data;
  }

  async linkTeacherStudent(teacherId, studentId, subject) {
    const { error } = await this.db.from('teacher_students').upsert({
      teacher_id: teacherId,
      student_id: studentId,
      subject,
    });
    if (error) throw error;
  }

  async unlinkTeacherStudent(teacherId, studentId) {
    const { error } = await this.db
      .from('teacher_students')
      .delete()
      .eq('teacher_id', teacherId)
      .eq('student_id', studentId);
    if (error) throw error;
  }

  async listGuardians() {
    const { data, error } = await this.db.from('guardians').select('*');
    if (error) throw error;
    return data;
  }

  async linkGuardian(parentId, studentId, relation) {
    const { error } = await this.db.from('guardians').upsert({
      parent_id: parentId,
      student_id: studentId,
      relation,
    });
    if (error) throw error;
  }

  async unlinkGuardian(parentId, studentId) {
    const { error } = await this.db
      .from('guardians')
      .delete()
      .eq('parent_id', parentId)
      .eq('student_id', studentId);
    if (error) throw error;
  }

  // ---------- notes ----------
  async listNotes({ studentId } = {}) {
    let q = this.db
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async createNote(row) {
    const { data, error } = await this.db
      .from('notes')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateNote(id, patch) {
    const { data, error } = await this.db
      .from('notes')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteNote(id) {
    const { error } = await this.db.from('notes').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- payments ----------
  async listPayments({ studentId } = {}) {
    let q = this.db
      .from('payments')
      .select('*')
      .order('period', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    const { data, error } = await q;
    if (error) throw error;
    return data;
  }

  async upsertPayment(row) {
    const { data, error } = await this.db
      .from('payments')
      .upsert(row, { onConflict: 'student_id,period' })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deletePayment(id) {
    const { error } = await this.db.from('payments').delete().eq('id', id);
    if (error) throw error;
  }
}
