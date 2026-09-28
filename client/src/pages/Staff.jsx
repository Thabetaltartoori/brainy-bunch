import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { PageHeader } from '../components/Shell.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Confirm,
  Empty,
  Field,
  Modal,
  Segment,
  SkeletonRows,
  Switch,
  toast,
} from '../components/ui.jsx';
import { IconEdit, IconLock, IconPlus, IconStaff, IconTrash } from '../icons.jsx';

const EMPTY_USER = {
  email: '',
  password: '',
  full_name: '',
  role: 'teacher',
  job_title: '',
  phone: '',
  is_active: true,
};

export function Staff({ user, onChanged }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();

  const [rows, setRows] = useState(null);
  const [classes, setClasses] = useState([]);
  const [role, setRole] = useState('all');
  const [editing, setEditing] = useState(null);
  const [editingSections, setEditingSections] = useState([]);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user.role === 'admin';

  const load = useCallback(async () => {
    try {
      const { users } = await api.users();
      setRows(users);
    } catch (err) {
      toast(err.message, 'error');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The section picker offers only classes that actually exist, derived
   * from the students themselves rather than a hand-kept list that would
   * drift out of date.
   */
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    api
      .students()
      .then(({ students }) => {
        if (cancelled) return;
        const counts = new Map();
        for (const s of students) {
          const key = `${s.grade}|${s.section ?? ''}`;
          const entry = counts.get(key) ?? { grade: s.grade, section: s.section ?? '', count: 0 };
          entry.count += 1;
          counts.set(key, entry);
        }
        setClasses(
          [...counts.values()].sort(
            (a, b) => a.grade.localeCompare(b.grade) || a.section.localeCompare(b.section),
          ),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, rows]);

  useEffect(() => {
    if (!editing?.id || editing.role !== 'teacher' || !isAdmin) {
      setEditingSections([]);
      return;
    }
    let cancelled = false;
    api
      .userSections(editing.id)
      .then(({ sections }) => {
        if (!cancelled) setEditingSections(sections.map((s) => ({ grade: s.grade, section: s.section })));
      })
      .catch(() => {
        if (!cancelled) setEditingSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editing?.id, editing?.role, isAdmin]);

  useEffect(() => {
    if (params.get('new') && isAdmin) {
      setEditing({ ...EMPTY_USER });
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, isAdmin]);

  async function save(values) {
    setBusy(true);
    try {
      const sections = values.sections ?? [];
      let userId = values.id;

      if (values.id) {
        const { id, email, sections: _s, ...patch } = values;
        // only send a password if a new one was typed
        if (!patch.password) delete patch.password;
        await api.updateUser(id, patch);
      } else {
        const { sections: _s, ...body } = values;
        const { user: created } = await api.createUser(body);
        userId = created.id;
      }

      // Sections only exist for teachers, and only an admin can set them.
      if (isAdmin && userId && values.role === 'teacher') {
        await api.setUserSections(userId, sections);
      }

      setEditing(null);
      toast(t('userSaved'));
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.deleteUser(removing.id);
      setRemoving(null);
      toast(t('userDeleted'));
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const counts = useMemo(() => {
    const acc = { admin: 0, teacher: 0, parent: 0 };
    for (const r of rows ?? []) if (r.role in acc) acc[r.role] += 1;
    return acc;
  }, [rows]);

  const filtered = useMemo(
    () => (rows ?? []).filter((u) => role === 'all' || u.role === role),
    [rows, role],
  );

  const options = [
    { value: 'all', label: `${t('filterAll')} (${rows?.length ?? 0})` },
    { value: 'teacher', label: `${t('roleTeacher')} (${counts.teacher})` },
    { value: 'parent', label: `${t('roleParent')} (${counts.parent})` },
    { value: 'admin', label: `${t('roleAdmin')} (${counts.admin})` },
  ];

  return (
    <div className="rise">
      <PageHeader title={t('staffTitle')} subtitle={t('staffSub')}>
        <Segment options={options} value={role} onChange={setRole} ariaLabel={t('role')} />
        {isAdmin && (
          <Button onClick={() => setEditing({ ...EMPTY_USER })} icon={<IconPlus size={17} />}>
            {t('addUser')}
          </Button>
        )}
      </PageHeader>

      <Card pad={false}>
        {rows === null ? (
          <div className="card__body">
            <SkeletonRows rows={5} height={40} />
          </div>
        ) : filtered.length === 0 ? (
          <Empty
            icon={<IconStaff size={24} />}
            title={t('nothingToShow')}
            action={
              isAdmin ? (
                <Button onClick={() => setEditing({ ...EMPTY_USER })} icon={<IconPlus size={17} />}>
                  {t('addUser')}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('colAccount')}</th>
                  <th>{t('colRole')}</th>
                  <th>{t('jobTitle')}</th>
                  <th>{t('phone')}</th>
                  <th>{t('colUserStatus')}</th>
                  {isAdmin && <th className="table__num" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={u.full_name} />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-person__name">{u.full_name}</div>
                          <div className="cell-person__meta" dir="ltr" style={{ textAlign: 'start' }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          u.role === 'admin' ? 'green' : u.role === 'teacher' ? 'amber' : 'outline'
                        }
                      >
                        {t(
                          u.role === 'admin'
                            ? 'roleAdmin'
                            : u.role === 'teacher'
                              ? 'roleTeacher'
                              : 'roleParent',
                        )}
                      </Badge>
                    </td>
                    <td className="c-muted fs-13">{u.job_title ?? '—'}</td>
                    <td className="c-muted fs-13 mono" dir="ltr" style={{ textAlign: 'start' }}>
                      {u.phone ?? '—'}
                    </td>
                    <td>
                      {u.is_active ? (
                        <Badge tone="green" dot>
                          {t('enabled')}
                        </Badge>
                      ) : (
                        <Badge tone="red" dot>
                          {t('disabled')}
                        </Badge>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="table__actions">
                          <Button
                            variant="soft"
                            size="sm"
                            aria-label={t('editUser')}
                            title={t('editUser')}
                            onClick={() =>
                              setEditing({
                                id: u.id,
                                full_name: u.full_name,
                                role: u.role,
                                job_title: u.job_title ?? '',
                                phone: u.phone ?? '',
                                is_active: u.is_active,
                                password: '',
                              })
                            }
                            icon={<IconEdit size={15} />}
                          />
                          {u.id !== user.id && (
                            <Button
                              variant="danger-ghost"
                              size="sm"
                              aria-label={t('deleteUser')}
                              title={t('deleteUser')}
                              onClick={() => setRemoving(u)}
                              icon={<IconTrash size={15} />}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserForm
        user={editing}
        classes={classes}
        sections={editingSections}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
        onSave={save}
        busy={busy}
      />

      <Confirm
        open={!!removing}
        title={t('deleteUser')}
        message={t('deleteUserWarn')}
        confirmLabel={t('deleteUser')}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        busy={busy}
      />
    </div>
  );
}

function UserForm({ user, classes, sections, isAdmin, onClose, onSave, busy }) {
  const { t } = useI18n();
  const [form, setForm] = useState(user ?? EMPTY_USER);
  const [errors, setErrors] = useState({});
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    setForm(user ?? EMPTY_USER);
    setErrors({});
  }, [user]);

  useEffect(() => {
    setPicked(sections.map((s) => `${s.grade}|${s.section}`));
  }, [sections]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const showSections = form.role === 'teacher' && isAdmin;
  const keyOf = (grade, section) => `${grade}|${section ?? ''}`;
  const toggle = (key) =>
    setPicked((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (!String(form.full_name ?? '').trim()) next.full_name = t('fieldRequired');

    if (!user?.id) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email ?? '')) next.email = t('fieldRequired');
      if ((form.password ?? '').length < 8) next.password = t('fieldRequired');
    } else if (form.password && form.password.length < 8) {
      next.password = t('fieldRequired');
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    onSave({
      id: form.id,
      email: String(form.email ?? '').trim().toLowerCase(),
      password: form.password || undefined,
      full_name: form.full_name.trim(),
      role: form.role,
      job_title: form.job_title?.trim() || '',
      phone: form.phone?.trim() || '',
      is_active: form.is_active !== false,
      sections: picked
        .map((key) => {
          const [grade, section] = key.split('|');
          return { grade, section };
        })
        .filter((s) => s.grade),
    });
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={user?.id ? t('editUser') : t('addUser')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={busy} type="submit">
            {t('save')}
          </Button>
        </>
      }
    >
      <form className="form" onSubmit={submit} noValidate>
        <Field label={t('fullName')} required error={errors.full_name}>
          <input
            className={`input ${errors.full_name ? 'input--error' : ''}`}
            value={form.full_name ?? ''}
            onChange={set('full_name')}
            autoFocus
          />
        </Field>

        <div className="grid-2">
          <Field label={t('role')} required>
            <select
              className="select"
              value={form.role}
              onChange={set('role')}
              disabled={user?.id === form.id}
            >
              <option value="teacher">{t('roleTeacher')}</option>
              <option value="parent">{t('roleParent')}</option>
              <option value="admin">{t('roleAdmin')}</option>
            </select>
          </Field>
          <Field label={t('jobTitle')}>
            <input
              className="input"
              value={form.job_title ?? ''}
              onChange={set('job_title')}
              placeholder={form.role === 'teacher' ? t('jobTitle') : ''}
            />
          </Field>
        </div>

        {showSections && (
          <Field label={t('sectionsLabel')} hint={t('sectionsHint')}>
            {classes.length === 0 ? (
              <p className="field__hint">{t('sectionsNone')}</p>
            ) : (
              <div className="check-grid">
                {classes.map((c) => {
                  const key = keyOf(c.grade, c.section);
                  const on = picked.includes(key);
                  return (
                    <label key={key} className={`check ${on ? 'check--on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggle(key)} />
                      <span>
                        {c.grade}
                        {c.section ? ` · ${c.section}` : ''}
                        <em>{c.count}</em>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Field>
        )}

        {!user?.id && (
          <Field label={t('email')} required error={errors.email}>
            <input
              className={`input ${errors.email ? 'input--error' : ''}`}
              type="email"
              dir="ltr"
              value={form.email ?? ''}
              onChange={set('email')}
              placeholder="name@brainybunch.school"
            />
          </Field>
        )}

        <Field
          label={user?.id ? t('newPassword') : t('password')}
          required={!user?.id}
          error={errors.password}
          hint={user?.id ? t('resetPassword') : undefined}
        >
          <input
            className={`input ${errors.password ? 'input--error' : ''}`}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={form.password ?? ''}
            onChange={set('password')}
            placeholder="••••••••"
          />
        </Field>

        <Field label={t('phone')}>
          <input
            className="input mono"
            dir="ltr"
            value={form.phone ?? ''}
            onChange={set('phone')}
            placeholder="+212 600 000 000"
          />
        </Field>

        {user?.id && (
          <Switch
            checked={form.is_active !== false}
            onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            label={form.is_active !== false ? t('enabled') : t('disabled')}
          />
        )}
      </form>
    </Modal>
  );
}
