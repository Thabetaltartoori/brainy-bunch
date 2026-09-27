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
  Confirm,
  Empty,
  Field,
  Modal,
  Segment,
  SkeletonRows,
  Switch,
  toast,
} from '../components/ui.jsx';
import { formatDate, formatPeriod } from '../format.js';
import { IconNote, IconPlus, IconTrash } from '../icons.jsx';

const KIND_TONE = { praise: 'green', recommendation: 'amber', concern: 'red' };

export function Notes({ user, onChanged }) {
  const { t, lang } = useI18n();
  const go = useNavigate();

  const [rows, setRows] = useState(null);
  const [kind, setKind] = useState('all');
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const canWrite = user.role === 'admin' || user.role === 'teacher';

  const load = useCallback(async () => {
    try {
      const { notes } = await api.notes();
      setRows(
        notes.map((n) => ({
          ...n,
          can_edit: user.role === 'admin' || n.teacher_id === user.id,
        })),
      );
    } catch (err) {
      toast(err.message, 'error');
      setRows([]);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove() {
    setBusy(true);
    try {
      await api.deleteNote(removing.id);
      setRemoving(null);
      toast(t('noteDeleted'));
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(
    () => (rows ?? []).filter((n) => kind === 'all' || n.kind === kind),
    [rows, kind],
  );

  const options = [
    { value: 'all', label: t('filterAll') },
    { value: 'recommendation', label: t('kindRecommendation') },
    { value: 'praise', label: t('kindPraise') },
    { value: 'concern', label: t('kindConcern'), danger: true },
  ];

  return (
    <div className="rise">
      <PageHeader title={t('notes')} subtitle={t('noNotesYetSub')}>
        <Segment options={options} value={kind} onChange={setKind} ariaLabel={t('noteKind')} />
      </PageHeader>

      <Card>
        {rows === null ? (
          <SkeletonRows rows={6} height={44} />
        ) : filtered.length === 0 ? (
          <Empty
            icon={<IconNote size={24} />}
            title={t('noNotesYet')}
            sub={t('noNotesYetSub')}
            action={
              canWrite ? (
                <Button onClick={() => go('/students')} icon={<IconPlus size={17} />}>
                  {t('qaAddNote')}
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="notes">
            {filtered.map((n) => (
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
                    <span className="note__date">
                      {formatDate(n.created_at, lang)} · {n.teacher_name}
                    </span>
                    <Badge tone={KIND_TONE[n.kind] ?? 'green'}>
                      {t(`kind${n.kind[0].toUpperCase()}${n.kind.slice(1)}`)}
                    </Badge>
                  </div>
                  <p className="note__text">{n.body}</p>
                  <div className="note__foot">
                    {n.is_shared ? (
                      <span className="chip">👁 {t('sharedWithParents')}</span>
                    ) : (
                      <span
                        className="chip"
                        style={{ color: 'var(--muted)', background: 'var(--bg-2)', borderColor: 'var(--line)' }}
                      >
                        🔒 {t('internalOnly')}
                      </span>
                    )}
                  </div>
                </div>

                {n.can_edit && (
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    aria-label={t('deleteNote')}
                    onClick={(e) => {
                      e.stopPropagation();
                      setRemoving(n);
                    }}
                    icon={<IconTrash size={15} />}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </Card>

      <Confirm
        open={!!removing}
        title={t('deleteNote')}
        message={t('deleteNoteWarn')}
        confirmLabel={t('deleteNote')}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        busy={busy}
      />
    </div>
  );
}
