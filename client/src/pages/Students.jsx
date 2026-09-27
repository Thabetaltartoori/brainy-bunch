import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
  toast,
} from '../components/ui.jsx';
import { formatMoney, useCurrency } from '../format.js';
import { IconEdit, IconPlus, IconSearch, IconTrash, IconUsers } from '../icons.jsx';

const STATUS_TONE = { paid: 'green', partial: 'amber', unpaid: 'red' };

const EMPTY_STUDENT = {
  full_name: '',
  grade: '',
  section: '',
  monthly_fee: 0,
  is_active: true,
};

export function Students({ user, onChanged }) {
  const { t, lang } = useI18n();
  const [currency] = useCurrency();
  const go = useNavigate();
  const [params, setParams] = useSearchParams();

  const [students, setStudents] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [grade, setGrade] = useState('all');
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = user.role === 'admin';

  const load = useCallback(async () => {
    try {
      const { students: rows } = await api.students({ q, status, grade });
      setStudents(rows);
    } catch (err) {
      toast(err.message, 'error');
      setStudents([]);
    }
  }, [q, status, grade]);

  useEffect(() => {
    const id = setTimeout(load, q ? 260 : 0); // debounce typing
    return () => clearTimeout(id);
  }, [load]);

  // Deep link from a dashboard quick action: /students?new=1
  useEffect(() => {
    if (params.get('new') && isAdmin) {
      setEditing({ ...EMPTY_STUDENT });
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams, isAdmin]);

  const grades = useMemo(
    () => [...new Set((students ?? []).map((s) => s.grade))].sort(),
    [students],
  );

  async function save(values) {
    setBusy(true);
    try {
      if (values.id) await api.updateStudent(values.id, values);
      else await api.createStudent(values);
      setEditing(null);
      toast(t('studentSaved'));
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
      await api.deleteStudent(removing.id);
      setRemoving(null);
      toast(t('studentDeleted'));
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const filters = [
    { value: 'all', label: t('filterAll') },
    { value: 'unpaid', label: t('filterUnpaid'), danger: true },
    { value: 'overdue', label: t('filterOverdue'), danger: true },
    { value: 'settled', label: t('filterSettled') },
  ];

  return (
    <div className="rise">
      <PageHeader title={t('studentsTitle')} subtitle={t('studentsSub')}>
        {isAdmin && (
          <Button onClick={() => setEditing({ ...EMPTY_STUDENT })} icon={<IconPlus size={17} />}>
            {t('addStudent')}
          </Button>
        )}
      </PageHeader>

      <Card pad={false}>
        <div
          className="card__head"
          style={{ flexWrap: 'wrap', rowGap: 10, borderBottom: 0, paddingBottom: 4 }}
        >
          <div className="search">
            <IconSearch size={16} className="search__icon" />
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('searchStudents')}
              aria-label={t('searchStudents')}
            />
          </div>

          <Segment options={filters} value={status} onChange={setStatus} ariaLabel={t('colStatus')} />

          {grades.length > 1 && (
            <select
              className="select"
              style={{ width: 165 }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              aria-label={t('colGrade')}
            >
              <option value="all">{t('filterAll')}</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          )}
        </div>

        {students === null ? (
          <div className="card__body">
            <SkeletonRows rows={6} />
          </div>
        ) : students.length === 0 ? (
          <Empty
            icon={<IconUsers size={24} />}
            title={q || status !== 'all' ? t('noMatch') : t('noStudents')}
            sub={q || status !== 'all' ? undefined : t('noStudentsSub')}
            action={
              isAdmin && !q ? (
                <Button onClick={() => setEditing({ ...EMPTY_STUDENT })} icon={<IconPlus size={17} />}>
                  {t('addStudent')}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('colName')}</th>
                  <th>{t('colGrade')}</th>
                  <th className="table__num">{t('colFee')}</th>
                  <th>{t('colStatus')}</th>
                  <th className="table__num">{t('colBalance')}</th>
                  {isAdmin && <th className="table__num">{t('colActions')}</th>}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} onClick={() => go(`/students/${s.id}`)}>
                    <td>
                      <div className="cell-person">
                        <Avatar name={s.full_name} />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-person__name">
                            {s.full_name}
                            {!s.is_active && (
                              <span style={{ marginInlineStart: 7 }}>
                                <Badge tone="outline">{t('inactive')}</Badge>
                              </span>
                            )}
                          </div>
                          <div className="cell-person__meta">
                            {s.noteCount} {t('tabNotes')}
                            {s.guardians.length > 0 && ` · ${s.guardians.length} 👨‍👩‍👧`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="nowrap">
                      {s.grade}
                      {s.section ? ` · ${s.section}` : ''}
                    </td>
                    <td className="table__num">{formatMoney(s.monthly_fee, currency, lang)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[s.feeSummary.currentStatus]} dot>
                        {t(
                          `status${
                            s.feeSummary.currentStatus[0].toUpperCase() +
                            s.feeSummary.currentStatus.slice(1)
                          }`,
                        )}
                      </Badge>
                      {s.feeSummary.overdueCount > 0 && (
                        <div className="fs-12 c-red mt-6">
                          +{s.feeSummary.overdueCount} {t('overdueMonths')}
                        </div>
                      )}
                    </td>
                    <td className="table__num">
                      {s.feeSummary.balance > 0 ? (
                        <span className="c-red">
                          {formatMoney(s.feeSummary.balance, currency, lang)}
                        </span>
                      ) : (
                        <span className="c-green">✓</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table__actions">
                          <Button
                            variant="soft"
                            size="sm"
                            aria-label={t('editStudent')}
                            title={t('editStudent')}
                            onClick={() => setEditing({ ...s })}
                            icon={<IconEdit size={15} />}
                          />
                          <Button
                            variant="danger-ghost"
                            size="sm"
                            aria-label={t('deleteStudent')}
                            title={t('deleteStudent')}
                            onClick={() => setRemoving(s)}
                            icon={<IconTrash size={15} />}
                          />
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

      <StudentForm
        student={editing}
        onClose={() => setEditing(null)}
        onSave={save}
        busy={busy}
      />

      <Confirm
        open={!!removing}
        title={t('deleteStudent')}
        message={t('deleteStudentWarn')}
        confirmLabel={t('deleteStudent')}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        busy={busy}
      />
    </div>
  );
}

/* =========================================================
   Add / edit student
   ========================================================= */

function StudentForm({ student, onClose, onSave, busy }) {
  const { t } = useI18n();
  const [currency] = useCurrency();
  const [form, setForm] = useState(student ?? EMPTY_STUDENT);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(student ?? EMPTY_STUDENT);
    setErrors({});
  }, [student]);

  const set = (key) => (e) => {
    const raw = e.target.value;
    setForm((f) => ({ ...f, [key]: key === 'monthly_fee' ? Number(raw) || 0 : raw }));
  };

  function submit(e) {
    e.preventDefault();
    const next = {};
    if (!String(form.full_name ?? '').trim()) next.full_name = t('fieldRequired');
    if (!String(form.grade ?? '').trim()) next.grade = t('fieldRequired');
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({
      id: form.id,
      full_name: form.full_name.trim(),
      grade: form.grade.trim(),
      section: form.section?.trim() || '',
      monthly_fee: Number(form.monthly_fee) || 0,
      is_active: form.is_active !== false,
    });
  }

  return (
    <Modal
      open={!!student}
      onClose={onClose}
      title={student?.id ? t('editStudent') : t('addStudent')}
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
          <Field label={t('gradeLabel')} required error={errors.grade}>
            <input
              className={`input ${errors.grade ? 'input--error' : ''}`}
              value={form.grade ?? ''}
              onChange={set('grade')}
              placeholder="Grade 4"
            />
          </Field>
          <Field label={t('sectionLabel')}>
            <input
              className="input"
              value={form.section ?? ''}
              onChange={set('section')}
              placeholder="A"
            />
          </Field>
        </div>

        <Field
          label={t('feeLabel')}
          hint={`${t('currencyLabel')}: ${currency}`}
        >
          <input
            className="input mono"
            type="number"
            min="0"
            step="0.01"
            value={form.monthly_fee ?? 0}
            onChange={set('monthly_fee')}
          />
        </Field>

        {student?.id && (
          <label className="switch">
            <input
              type="checkbox"
              checked={form.is_active !== false}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            <span className="switch__track" />
            <span>{t('active')}</span>
          </label>
        )}
      </form>
    </Modal>
  );
}
