import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
  Meter,
  Modal,
  Segment,
  Spinner,
  Switch,
  toast,
} from '../components/ui.jsx';
import {
  currentPeriod,
  formatDate,
  formatMoney,
  formatPeriod,
  recentPeriods,
  todayISO,
  useCurrency,
} from '../format.js';
import {
  IconArrowLeft,
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconEdit,
  IconLock,
  IconMoney,
  IconNote,
  IconPlus,
  IconTrash,
  IconUnlock,
  IconUser,
} from '../icons.jsx';

const KIND_TONE = { praise: 'green', recommendation: 'amber', concern: 'red' };
const STATUS_TONE = { paid: 'green', partial: 'amber', unpaid: 'red' };
const TABS = ['overview', 'notes', 'payments', 'people'];

/**
 * Stand-in for a student with no payments recorded.
 *
 * Shared on purpose: it is used as a useEffect dependency, and a fresh `{}`
 * each render would re-run that effect on every single render.
 */
const NO_PAYMENTS = {};

export function StudentProfile({ user, onChanged }) {
  const { id } = useParams();
  const { t, lang, dir } = useI18n();
  const [currency] = useCurrency();
  const go = useNavigate();

  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [noteOpen, setNoteOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.student(id));
    } catch (err) {
      toast(err.message, 'error');
      go('/students');
    }
  }, [id, go]);

  useEffect(() => {
    setData(null);
    setTab('overview');
    load();
  }, [load]);

  async function removeRecord() {
    setBusy(true);
    try {
      if (removing.kind === 'note') await api.deleteNote(removing.id);
      else await api.deletePayment(removing.id);
      setRemoving(null);
      toast(removing.kind === 'note' ? t('noteDeleted') : t('paymentDeleted'));
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="rise">
        <Spinner />
      </div>
    );
  }

  const { student, notes } = data;
  const fee = student.feeSummary;
  const canWrite = user.role === 'admin' || user.role === 'teacher';
  const isAdmin = user.role === 'admin';
  const BackIcon = dir === 'rtl' ? IconArrowRight : IconArrowLeft;

  return (
    <div className="rise">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => go('/students')}
        icon={<BackIcon size={16} />}
        className="mb-14"
      >
        {t('backToStudents')}
      </Button>

      {/* ---------- header card ---------- */}
      <Card className="mb-14">
        <div className="flex items-center gap-12 wrap">
          <Avatar name={student.full_name} size="lg" />
          <div className="grow" style={{ minWidth: 180 }}>
            <h2 style={{ fontSize: 21, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              {student.full_name}
              <Badge tone={STATUS_TONE[fee.currentStatus]} dot>
                {t(
                  `status${fee.currentStatus[0].toUpperCase()}${fee.currentStatus.slice(1)}`,
                )}
              </Badge>
              {!student.is_active && <Badge tone="outline">{t('inactive')}</Badge>}
            </h2>
            <p className="fs-13 c-muted mt-6">
              {student.grade}
              {student.section ? ` · ${student.section}` : ''} · {formatMoney(student.monthly_fee, currency, lang)}{' '}
              {lang === 'ar' ? 'شهرياً' : '/ month'} · {t('enrolled')} {formatDate(student.created_at, lang)}
            </p>
          </div>

          <div className="flex gap-8 wrap">
            {canWrite && (
              <Button
                variant="ghost"
                onClick={() => setNoteOpen(true)}
                icon={<IconNote size={16} />}
              >
                {t('addNote')}
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setPayOpen(true)} icon={<IconMoney size={16} />}>
                {t('recordPayment')}
              </Button>
            )}
          </div>
        </div>

        <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginTop: 20 }}>
          <MiniStat label={t('expected')} value={formatMoney(fee.expected, currency, lang)} foot={`${fee.periods.length} ${t('monthsBilled')}`} />
          <MiniStat label={t('collected')} value={formatMoney(fee.paid, currency, lang)} tone="green" />
          <MiniStat
            label={t('stillDue')}
            value={formatMoney(fee.balance, currency, lang)}
            tone={fee.balance > 0 ? 'red' : 'green'}
            foot={fee.overdueCount > 0 ? `${fee.overdueCount} ${t('overdueMonths')}` : undefined}
          />
        </div>

        <div className="mt-16">
          <Meter
            value={fee.paid}
            max={fee.expected}
            tone={fee.balance > 0 ? (fee.overdueCount > 0 ? 'red' : 'amber') : undefined}
          />
        </div>
      </Card>

      {/* ---------- tabs ---------- */}
      <div className="tabbar">
        <TabButton on={tab === 'overview'} onClick={() => setTab('overview')}>
          {t('tabOverview')}
        </TabButton>
        <TabButton on={tab === 'notes'} onClick={() => setTab('notes')}>
          {t('tabNotes')} ({notes.length})
        </TabButton>
        <TabButton on={tab === 'payments'} onClick={() => setTab('payments')}>
          {t('tabPayments')}
        </TabButton>
        {isAdmin && (
          <TabButton on={tab === 'people'} onClick={() => setTab('people')}>
            {t('tabPeople')}
          </TabButton>
        )}
      </div>

      {tab === 'overview' && (
        <div className="rise" style={{ display: 'grid', gap: 15 }}>
          <Card title={t('feeSummary')}>
            <Ledger student={student} />
          </Card>
          <Card title={t('recentNotes')}>
            <NoteList notes={notes.slice(0, 3)} canEdit={false} onWrite={() => setNoteOpen(true)} canWrite={canWrite} />
          </Card>
        </div>
      )}

      {tab === 'notes' && (
        <div className="rise">
          <Card
            title={t('tabNotes')}
            subtitle={`${notes.length}`}
            actions={
              canWrite ? (
                <Button size="sm" onClick={() => setNoteOpen(true)} icon={<IconPlus size={15} />}>
                  {t('addNote')}
                </Button>
              ) : null
            }
          >
            <NoteList
              notes={notes}
              canEdit={isAdmin || notes.some((n) => n.teacher_id === user.id)}
              onWrite={() => setNoteOpen(true)}
              canWrite={canWrite}
              onDelete={(n) => setRemoving({ kind: 'note', ...n })}
            />
          </Card>
        </div>
      )}

      {tab === 'payments' && (
        <div className="rise">
          <Card
            title={t('payHistory')}
            actions={
              isAdmin ? (
                <Button size="sm" onClick={() => setPayOpen(true)} icon={<IconPlus size={15} />}>
                  {t('recordPayment')}
                </Button>
              ) : null
            }
          >
            <Ledger
              student={student}
              onPay={(period) => setPayOpen({ period })}
              onDelete={(p) => setRemoving({ kind: 'payment', ...p })}
            />
          </Card>
        </div>
      )}

      {tab === 'people' && isAdmin && (
        <div className="rise" style={{ display: 'grid', gap: 15 }}>
          <PeopleCard
            title={t('teachersLabel')}
            people={student.teachers}
            students={[student]}
            onChanged={load}
          />
          <PeopleCard
            title={t('guardiansLabel')}
            people={student.guardians}
            students={[student]}
            onChanged={load}
          />
        </div>
      )}

      <NoteModal
        open={!!noteOpen}
        studentId={student.id}
        onClose={() => setNoteOpen(false)}
        onSaved={async () => {
          setNoteOpen(false);
          toast(t('noteSaved'));
          await load();
          onChanged?.();
        }}
      />

      <PaymentModal
        open={!!payOpen}
        student={student}
        initialPeriod={payOpen?.period}
        onClose={() => setPayOpen(false)}
        onSaved={async () => {
          setPayOpen(false);
          toast(t('paymentSaved'));
          await load();
          onChanged?.();
        }}
      />

      <Confirm
        open={!!removing}
        title={removing?.kind === 'note' ? t('deleteNote') : t('deletePayment')}
        message={removing?.kind === 'note' ? t('deleteNoteWarn') : t('deletePaymentWarn')}
        confirmLabel={removing?.kind === 'note' ? t('deleteNote') : t('deletePayment')}
        onCancel={() => setRemoving(null)}
        onConfirm={removeRecord}
        busy={busy}
      />
    </div>
  );
}

/* ---------- small pieces ---------- */

function TabButton({ on, onClick, children }) {
  return (
    <button className={`tab ${on ? 'tab--on' : ''}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function MiniStat({ label, value, foot, tone }) {
  return (
    <div>
      <div className="fs-12 c-muted fw-700">{label}</div>
      <div
        className="fw-700 mono"
        style={{
          fontSize: 20,
          letterSpacing: '-0.02em',
          color:
            tone === 'red' ? 'var(--r-600)' : tone === 'green' ? 'var(--g-700)' : 'var(--ink)',
        }}
      >
        {value}
      </div>
      {foot && <div className="fs-12 c-muted">{foot}</div>}
    </div>
  );
}

/* ---------- notes list ---------- */

function NoteList({ notes, canEdit, canWrite, onWrite, onDelete }) {
  const { t, lang } = useI18n();

  if (notes.length === 0) {
    return (
      <Empty
        icon={<IconNote size={24} />}
        title={t('noNotesYet')}
        sub={canWrite ? t('noNotesYetSub') : undefined}
        action={
          canWrite ? (
            <Button onClick={onWrite} icon={<IconPlus size={17} />}>
              {t('addNote')}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <div className="notes">
      {notes.map((n) => (
        <article key={n.id} className={`note note--${n.kind}`}>
          <Avatar name={n.teacher_name} size="sm" />
          <div className="note__body">
            <div className="note__meta">
              <span className="note__author">{n.teacher_name}</span>
              <span className="note__date">
                <IconClock size={12} style={{ verticalAlign: '-2px' }} /> {formatDate(n.created_at, lang)}
              </span>
              <Badge tone={KIND_TONE[n.kind] ?? 'green'}>
                {t(`kind${n.kind[0].toUpperCase()}${n.kind.slice(1)}`)}
              </Badge>
            </div>
            <p className="note__text">{n.body}</p>
            <div className="note__foot">
              {n.is_shared ? (
                <span className="chip" style={{ color: 'var(--g-700)' }}>
                  <IconUnlock size={12} /> {t('sharedWithParents')}
                </span>
              ) : (
                <span className="chip" style={{ color: 'var(--muted)', background: 'var(--bg-2)', borderColor: 'var(--line)' }}>
                  <IconLock size={12} /> {t('internalOnly')}
                </span>
              )}
              {canEdit && onDelete && (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={() => onDelete(n)}
                  icon={<IconTrash size={14} />}
                  aria-label={t('deleteNote')}
                />
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ---------- payment ledger ---------- */

function Ledger({ student, onPay, onDelete }) {
  const { t, lang } = useI18n();
  const [currency] = useCurrency();
  const fee = student.feeSummary;
  const now = currentPeriod();

  // Oldest month first reads like a statement.
  const rows = [...fee.periods].reverse();

  if (rows.length === 0) {
    return <Empty icon={<IconMoney size={22} />} title={t('noPayments')} />;
  }

  return (
    <div className="ledger">
      {rows.map((period) => {
        const payment = fee.paidPeriods[period];
        const isCurrent = period === now;
        const short = payment && student.monthly_fee > 0 && Number(payment.amount) < student.monthly_fee;
        const overdue = !payment && period < now;

        return (
          <div
            key={period}
            className={`ledger__row ${!payment || short ? 'ledger__row--unpaid' : ''}`}
          >
            <IconCalendar size={16} style={{ color: overdue ? 'var(--r-500)' : 'var(--muted)' }} />
            <span className="ledger__month">{formatPeriod(period, lang)}</span>

            {isCurrent && <Badge tone="green">{t('statCollected')}</Badge>}

            {payment ? (
              <>
                <span className="badge badge--green">
                  <IconCheck size={12} /> {t('paidOn')}
                </span>
                <span className="ledger__method">
                  {t(`method${payment.method ? payment.method[0].toUpperCase() + payment.method.slice(1) : 'Cash'}`)}{' '}
                  · {formatDate(payment.paid_on, lang)}
                </span>
              </>
            ) : (
              <Badge tone={overdue ? 'red' : 'amber'} dot>
                {overdue ? t('filterOverdue') : t('statusUnpaid')}
              </Badge>
            )}

            <span
              className="ledger__amount"
              style={{ color: payment ? 'var(--g-700)' : 'var(--r-600)' }}
            >
              {payment
                ? formatMoney(payment.amount, currency, lang)
                : formatMoney(student.monthly_fee, currency, lang)}
            </span>

            {onPay && (
              <Button
                variant={payment ? 'ghost' : 'soft'}
                size="sm"
                onClick={() => onPay(period)}
                icon={<IconEdit size={14} />}
              >
                {payment ? t('editPayment') : t('markPaid')}
              </Button>
            )}
            {onDelete && payment && (
              <Button
                variant="danger-ghost"
                size="sm"
                onClick={() => onDelete(payment)}
                icon={<IconTrash size={14} />}
                aria-label={t('deletePayment')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- teachers / guardians ---------- */

function PeopleCard({ title, people, students, onChanged }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isGuardian = title === t('guardiansLabel');

  return (
    <Card
      title={title}
      subtitle={`${people.length}`}
      actions={
        <Button size="sm" variant="soft" onClick={() => setOpen(true)} icon={<IconPlus size={15} />}>
          {isGuardian ? t('assignGuardian') : t('assignTeacher')}
        </Button>
      }
    >
      {people.length === 0 ? (
        <Empty icon={<IconUser size={22} />} title={t('assignedNone')} />
      ) : (
        <div className="notes">
          {people.map((p) => (
            <article key={p.id} className="note note--recommendation" style={{ alignItems: 'center' }}>
              <Avatar name={p.name} />
              <div className="note__body">
                <div className="note__author">{p.name}</div>
                <div className="fs-12 c-muted">
                  {p.subject ?? p.relation ?? '—'}
                </div>
              </div>
              <RemoveLink
                onClick={async () => {
                  try {
                    if (isGuardian) await api.unassignGuardian(students[0].id, p.id);
                    else await api.unassignTeacher(students[0].id, p.id);
                    toast(t('close'));
                    onChanged();
                  } catch (err) {
                    toast(err.message, 'error');
                  }
                }}
                label={t('close')}
              />
            </article>
          ))}
        </div>
      )}

      <AssignModal
        open={open}
        onClose={() => setOpen(false)}
        role={isGuardian ? 'parent' : 'teacher'}
        studentId={students[0].id}
        existing={people.map((p) => p.id)}
        onDone={async () => {
          setOpen(false);
          onChanged();
        }}
      />
    </Card>
  );
}

function RemoveLink({ onClick, label }) {
  return (
    <Button variant="danger-ghost" size="sm" onClick={onClick} aria-label={label}>
      <IconTrash size={14} />
    </Button>
  );
}

function AssignModal({ open, onClose, role, studentId, existing, onDone }) {
  const { t } = useI18n();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const isGuardian = role === 'parent';

  useEffect(() => {
    if (!open) return;
    api
      .users(role)
      .then(({ users: rows }) => setUsers(rows.filter((u) => !existing.includes(u.id))))
      .catch((err) => toast(err.message, 'error'));
  }, [open, role, existing]);

  async function submit() {
    if (!selected) return;
    setBusy(true);
    try {
      if (isGuardian) await api.assignGuardian(studentId, selected, extra || null);
      else await api.assignTeacher(studentId, selected, extra || null);
      setSelected('');
      setExtra('');
      toast(t('save'));
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isGuardian ? t('assignGuardian') : t('assignTeacher')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={busy} disabled={!selected}>
            {t('save')}
          </Button>
        </>
      }
    >
      {users.length === 0 ? (
        <Empty icon={<IconUser size={22} />} title={t('nothingToShow')} />
      ) : (
        <div className="form">
          <Field label={isGuardian ? t('colRole') : t('teachersLabel')} required>
            <select className="select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                  {u.job_title ? ` · ${u.job_title}` : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={isGuardian ? t('relation') : t('assignSubject')}
            hint={isGuardian ? t('relationFather') : t('jobTitle')}
          >
            <input
              className="input"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={isGuardian ? t('relationMother') : t('jobTitle')}
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

/* ---------- note modal ---------- */

function NoteModal({ open, studentId, onClose, onSaved }) {
  const { t } = useI18n();
  const [kind, setKind] = useState('recommendation');
  const [body, setBody] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setKind('recommendation');
      setBody('');
      setIsShared(true);
      setError('');
    }
  }, [open]);

  async function submit() {
    if (!body.trim()) {
      setError(t('fieldRequired'));
      return;
    }
    setBusy(true);
    try {
      await api.createNote({
        student_id: studentId,
        kind,
        body: body.trim(),
        is_shared: isShared,
      });
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const options = [
    { value: 'recommendation', label: t('kindRecommendation') },
    { value: 'praise', label: t('kindPraise') },
    { value: 'concern', label: t('kindConcern'), danger: true },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('addNote')}
      subtitle={t('noteShareHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={busy}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="form">
        <Field label={t('noteKind')}>
          <Segment options={options} value={kind} onChange={setKind} ariaLabel={t('noteKind')} />
        </Field>

        <Field label={t('noteBody')} required error={error}>
          <textarea
            className={`textarea ${error ? 'textarea--error' : ''}`}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setError('');
            }}
            placeholder={t('noteBody')}
            autoFocus
          />
        </Field>

        <Switch
          checked={isShared}
          onChange={setIsShared}
          label={t('noteShare')}
          hint={t('noteShareHint')}
        />
      </div>
    </Modal>
  );
}

/* ---------- payment modal ---------- */

function PaymentModal({ open, student, initialPeriod, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const [currency] = useCurrency();
  const existing = student?.feeSummary?.paidPeriods ?? NO_PAYMENTS;

  const [period, setPeriod] = useState(currentPeriod());
  const [amount, setAmount] = useState(student?.monthly_fee ?? 0);
  const [method, setMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p = initialPeriod ?? currentPeriod();
    setPeriod(p);
    // Pre-fill from the existing payment for that month, or the student's fee.
    const found = existing.get(p);
    setAmount(found ? Number(found.amount) : Number(student?.monthly_fee ?? 0));
    setMethod(found?.method ?? 'cash');
    setPaidOn(found?.paid_on ?? todayISO());
    setNote(found?.note ?? '');
  }, [open, initialPeriod, existing, student]);

  async function submit() {
    setBusy(true);
    try {
      await api.createPayment({
        student_id: student.id,
        period,
        amount: Number(amount) || 0,
        method,
        paid_on: paidOn || null,
        note: note || null,
      });
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={Object.hasOwn(existing, period) ? t('editPayment') : t('recordPayment')}
      subtitle={student?.full_name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button onClick={submit} loading={busy}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="form">
        <div className="grid-2">
          <Field label={t('monthLabel')} required>
            <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {recentPeriods(14).reverse().map((p) => (
                <option key={p} value={p}>
                  {formatPeriod(p, lang)}
                  {Object.hasOwn(existing, p) ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('amountLabel')} required>
            <input
              className="input mono"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid-2">
          <Field label={t('methodLabel')}>
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['cash', 'transfer', 'online', 'cheque'].map((m) => (
                <option key={m} value={m}>
                  {t(`method${m[0].toUpperCase()}${m.slice(1)}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('paidOnLabel')}>
            <input
              className="input mono"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t('noteLabel')}>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('noteLabel')}
          />
        </Field>
      </div>
    </Modal>
  );
}
