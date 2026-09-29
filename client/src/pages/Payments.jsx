import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { PageHeader } from '../components/Shell.jsx';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Meter,
  Modal,
  Segment,
  SkeletonRows,
  Stat,
  toast,
} from '../components/ui.jsx';
import {
  currentPeriod,
  formatDate,
  formatMoney,
  formatMoneyShort,
  formatPeriod,
  recentPeriods,
  todayISO,
  useCurrency,
} from '../format.js';
import { IconAlert, IconCheck, IconMoney, IconTrendUp, IconWallet } from '../icons.jsx';

const STATUS_TONE = { paid: 'green', partial: 'amber', unpaid: 'red' };

/**
 * Stand-in for a student with no payments recorded.
 *
 * Shared on purpose: it is used as a useEffect dependency, and a fresh `{}`
 * each render would re-run that effect on every single render.
 */
const NO_PAYMENTS = {};

export function Payments({ user, onChanged }) {
  const { t, lang } = useI18n();
  const [currency] = useCurrency();
  const go = useNavigate();

  const [students, setStudents] = useState(null);
  const [status, setStatus] = useState('all');
  const [paying, setPaying] = useState(null);

  const isAdmin = user.role === 'admin';
  const isParent = user.role === 'parent';

  const load = useCallback(async () => {
    try {
      const { students: rows } = await api.students({});
      setStudents(rows);
    } catch (err) {
      toast(err.message, 'error');
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(
    () =>
      (students ?? [])
        .filter((s) => status === 'all' || s.feeSummary.currentStatus === status)
        .sort((a, b) => b.feeSummary.balance - a.feeSummary.balance),
    [students, status],
  );

  if (students === null) {
    return (
      <div className="rise">
        <div className="card card--pad">
          <SkeletonRows rows={8} />
        </div>
      </div>
    );
  }

  const totals = students.reduce(
    (acc, s) => {
      acc.expected += s.feeSummary.expected;
      acc.paid += s.feeSummary.paid;
      acc.outstanding += s.feeSummary.balance;
      if (s.feeSummary.currentStatus === 'paid') acc.paidCount += 1;
      return acc;
    },
    { expected: 0, paid: 0, outstanding: 0, paidCount: 0 },
  );
  const rate = totals.expected ? Math.round((totals.paid / totals.expected) * 100) : 0;

  const filters = [
    { value: 'all', label: t('filterAll') },
    { value: 'paid', label: t('filterPaid') },
    { value: 'partial', label: t('statusPartial') },
    { value: 'unpaid', label: t('filterUnpaid'), danger: true },
  ];

  return (
    <div className="rise">
      <PageHeader
        title={t('payments')}
        subtitle={formatPeriod(currentPeriod(), lang)}
      >
        <Segment options={filters} value={status} onChange={setStatus} ariaLabel={t('colStatus')} />
      </PageHeader>

      {/* A parent sees one figure per child, not a combined school total. */}
      {!isParent && (
        <div className="stats stagger">
          <Stat
            label={t('collected')}
            value={formatMoneyShort(totals.paid, currency, lang)}
            icon={<IconTrendUp size={19} />}
            percent={rate}
            foot={`${t('payRate')}: ${rate}%`}
          />
          <Stat
            label={t('statOutstanding')}
            value={formatMoneyShort(totals.outstanding, currency, lang)}
            icon={<IconAlert size={19} />}
            tone="red"
            danger={totals.outstanding > 0}
            foot={`${t('expected')}: ${formatMoneyShort(totals.expected, currency, lang)}`}
          />
          <Stat
            label={t('statPaidCount')}
            value={`${totals.paidCount}/${students.length}`}
            icon={<IconCheck size={19} />}
            foot={formatPeriod(currentPeriod(), lang)}
          />
        </div>
      )}

      <div className="section">
        <Card pad={false}>
          {rows.length === 0 ? (
            <Empty icon={<IconMoney size={24} />} title={t('nothingToShow')} />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('colName')}</th>
                    <th>{t('colGrade')}</th>
                    <th className="table__num">{t('colFee')}</th>
                    <th style={{ minWidth: 150 }}>{t('payRate')}</th>
                    <th>{t('colStatus')}</th>
                    <th className="table__num">{t('colBalance')}</th>
                    {isAdmin && <th className="table__num" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} onClick={() => go(`/students/${s.id}`)}>
                      <td>
                        <div className="cell-person">
                          <Avatar name={s.full_name} />
                          <div className="cell-person__name">{s.full_name}</div>
                        </div>
                      </td>
                      <td className="nowrap">
                        {s.grade}
                        {s.section ? ` · ${s.section}` : ''}
                      </td>
                      <td className="table__num">{formatMoney(s.monthly_fee, currency, lang)}</td>
                      <td>
                        <Meter
                          value={s.feeSummary.paid}
                          max={s.feeSummary.expected}
                          tone={
                            s.feeSummary.balance === 0
                              ? undefined
                              : s.feeSummary.overdueCount > 0
                                ? 'red'
                                : 'amber'
                          }
                        />
                      </td>
                      <td>
                        <Badge tone={STATUS_TONE[s.feeSummary.currentStatus]} dot>
                          {t(
                            `status${s.feeSummary.currentStatus[0].toUpperCase()}${s.feeSummary.currentStatus.slice(1)}`,
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
                          <span className="c-red fw-700">
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
                              size="sm"
                              variant={s.feeSummary.currentStatus === 'paid' ? 'ghost' : 'soft'}
                              onClick={() => setPaying(s)}
                              icon={<IconWallet size={14} />}
                            >
                              {t('recordPayment')}
                            </Button>
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
      </div>

      {paying && (
        <PayModal
          student={paying}
          onClose={() => setPaying(null)}
          onSaved={async () => {
            setPaying(null);
            toast(t('paymentSaved'));
            await load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

function PayModal({ student, onClose, onSaved }) {
  const { t, lang } = useI18n();
  const [currency] = useCurrency();
  // A plain object keyed by month, not a Map. The default keeps the form
  // usable if a student ever comes back without a fee summary.
  const existing = student.feeSummary?.paidPeriods ?? NO_PAYMENTS;

  const [period, setPeriod] = useState(currentPeriod());
  const [amount, setAmount] = useState(student.monthly_fee);
  const [method, setMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Prefill when switching month to one that already has a payment.
  useEffect(() => {
    const found = existing[period];
    setAmount(found ? Number(found.amount) : Number(student.monthly_fee) || 0);
    setMethod(found?.method ?? 'cash');
    setPaidOn(found?.paid_on ?? todayISO());
    setNote(found?.note ?? '');
  }, [period, existing, student.monthly_fee]);

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
      open
      onClose={onClose}
      title={Object.hasOwn(existing, period) ? t('editPayment') : t('recordPayment')}
      subtitle={student.full_name}
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
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <p className="fs-12 c-muted">
          {t('feeLabel')}: {formatMoney(student.monthly_fee, currency, lang)} ·{' '}
          {t('stillDue')}:{' '}
          <span className="c-red fw-700">
            {formatMoney(student.feeSummary.balance, currency, lang)}
          </span>
        </p>
      </div>
    </Modal>
  );
}
