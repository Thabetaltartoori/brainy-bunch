import { useNavigate } from 'react-router-dom';

import { useI18n } from '../i18n.jsx';
import { PageHeader } from '../components/Shell.jsx';
import { Avatar, Badge, Button, Card, Empty, Meter, Stat } from '../components/ui.jsx';
import { formatMoney, formatMoneyShort, formatPeriod, useCurrency } from '../format.js';
import {
  IconAlert,
  IconClock,
  IconInbox,
  IconMoney,
  IconNote,
  IconPlus,
  IconStudents,
  IconTrendUp,
  IconWallet,
} from '../icons.jsx';

const KIND_TONE = { praise: 'green', recommendation: 'amber', concern: 'red' };

export function Dashboard({ stats, user }) {
  const { t, lang } = useI18n();
  const [currency] = useCurrency();
  const go = useNavigate();

  if (!stats) return null;

  const payRate = stats.totalExpected
    ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
    : 0;

  const isParent = user.role === 'parent';
  const quick = isParent
    ? []
    : [
        { label: t('qaAddStudent'), Icon: IconStudents, to: '/students?new=1', admin: true },
        { label: t('qaAddNote'), Icon: IconNote, to: '/notes' },
        { label: t('qaRecordPayment'), Icon: IconWallet, to: '/payments', admin: true },
        { label: t('qaAddUser'), Icon: IconPlus, to: '/staff?new=1', admin: true },
      ].filter((q) => !q.admin || user.role === 'admin');

  return (
    <div className="rise">
      <PageHeader
        title={t('greeting') + (user.full_name ? `, ${user.full_name.split(' ')[0]}` : '')}
        subtitle={t('dashSub')}
      />

      <div className="stats stagger">
        <Stat
          label={t('statStudents')}
          value={stats.totalStudents}
          icon={<IconStudents size={19} />}
          foot={t('statStudentsFoot')}
        />

        {!isParent && (
          <Stat
            label={t('statCollected')}
            value={formatMoneyShort(stats.collectedThisMonth, currency, lang)}
            icon={<IconTrendUp size={19} />}
            foot={
              <>
                {t('payRate')} · {formatPeriod(stats.period, lang, { short: true })}
              </>
            }
            percent={payRate}
          />
        )}

        {!isParent && (
          <Stat
            label={t('statOutstanding')}
            value={formatMoneyShort(stats.totalOutstanding, currency, lang)}
            icon={<IconMoney size={19} />}
            tone="red"
            danger={stats.totalOutstanding > 0}
            foot={
              <>
                {stats.overdueCount > 0
                  ? `${stats.overdueCount} ${t('overdueMonths')}`
                  : t('statOutstandingFoot')}
              </>
            }
            percent={100 - payRate}
          />
        )}

        <Stat
          label={isParent ? t('tabNotes') : t('statNotes')}
          value={stats.noteCount}
          icon={<IconNote size={19} />}
          foot={
            stats.concernCount > 0 ? (
              <>
                <IconAlert size={13} /> {stats.concernCount} {t('statConcerns')}
              </>
            ) : (
              t('statPaidCount')
            )
          }
        />
      </div>

      <div className="section">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)',
            gap: 15,
            alignItems: 'start',
          }}
          className="dash-split"
        >
          <Card
            title={t('recentNotes')}
            subtitle={
              isParent ? t('tabNotes') : `${stats.sharedNoteCount} ${t('sharedWithParents')}`
            }
            actions={
              <Button variant="soft" size="sm" onClick={() => go('/notes')} icon={<IconInbox size={15} />}>
                {t('notes')}
              </Button>
            }
          >
            {stats.recentNotes.length === 0 ? (
              <Empty icon={<IconNote size={24} />} title={t('noRecentNotes')} sub={t('noNotesYetSub')} />
            ) : (
              <div className="notes">
                {stats.recentNotes.map((n) => (
                  <article
                    key={n.id}
                    className={`note note--${n.kind}`}
                    onClick={() => go(`/students/${n.student_id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Avatar name={n.student_name} />
                    <div className="note__body">
                      <div className="note__meta">
                        <span className="note__author">{n.student_name}</span>
                        <Badge tone={KIND_TONE[n.kind] ?? 'green'}>
                          {t(`kind${n.kind[0].toUpperCase()}${n.kind.slice(1)}`)}
                        </Badge>
                        <span className="note__date">
                          <IconClock size={12} style={{ verticalAlign: '-2px' }} />{' '}
                          {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-MA' : 'en-GB', {
                            day: 'numeric',
                            month: 'short',
                          }).format(new Date(n.created_at))}
                        </span>
                      </div>
                      <p className="note__text" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </Card>

          <div style={{ display: 'grid', gap: 15 }}>
            <Card title={t('byGrade')}>
              {stats.byGrade.length === 0 ? (
                <Empty icon={<IconStudents size={22} />} title={t('nothingToShow')} />
              ) : (
                <div style={{ display: 'grid', gap: 13 }}>
                  {stats.byGrade.map((g) => {
                    const max = Math.max(...stats.byGrade.map((x) => x.count), 1);
                    return (
                      <div key={g.grade}>
                        <div className="flex items-center between mb-10">
                          <span className="fs-13 fw-700">{g.grade}</span>
                          <span className="fs-12 c-muted mono">{g.count}</span>
                        </div>
                        <Meter value={g.count} max={max} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {quick.length > 0 && (
              <Card title={t('quickActions')}>
                <div style={{ display: 'grid', gap: 8 }}>
                  {quick.map((q) => (
                    <Button
                      key={q.to + q.label}
                      variant="ghost"
                      block
                      onClick={() => go(q.to)}
                      icon={<q.Icon size={16} />}
                      style={{ justifyContent: 'flex-start' }}
                    >
                      {q.label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {!isParent && stats.overdueCount > 0 && (
        <div className="section">
          <Card>
            <div className="flex items-center gap-12 wrap">
              <span className="stat__icon stat__icon--red" style={{ width: 40, height: 40 }}>
                <IconAlert size={20} />
              </span>
              <div className="grow">
                <div className="fw-700">
                  {stats.overdueCount} {t('overdueMonths')}
                </div>
                <div className="fs-12 c-muted">
                  {t('statOutstanding')}:{' '}
                  <span className="c-red fw-700">
                    {formatMoney(stats.totalOutstanding, currency, lang)}
                  </span>
                </div>
              </div>
              <Button
                variant="danger-ghost"
                onClick={() => go('/payments')}
                icon={<IconMoney size={16} />}
              >
                {t('payments')}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
