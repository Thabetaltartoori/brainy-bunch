import { useCallback, useEffect, useState } from 'react';

import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { PageHeader } from '../components/Shell.jsx';
import {
  Button,
  Card,
  Confirm,
  Empty,
  Field,
  Modal,
  Segment,
  Switch,
  toast,
} from '../components/ui.jsx';
import { CURRENCIES, useCurrency } from '../format.js';
import { IconEdit, IconMegaphone, IconPlus, IconTrash } from '../icons.jsx';

const EMPTY = { body_ar: '', body_en: '', tone: 'green', sort_order: 0, is_active: true };

export function Announcements({ onChanged }) {
  const { t } = useI18n();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { announcements } = await api.announcements();
      setRows(announcements);
    } catch (err) {
      toast(err.message, 'error');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(values) {
    setBusy(true);
    try {
      if (values.id) await api.updateAnnouncement(values.id, values);
      else await api.createAnnouncement(values);
      setEditing(null);
      toast(t('annSaved'));
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
      await api.deleteAnnouncement(removing.id);
      setRemoving(null);
      toast(t('annDeleted'));
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(a) {
    try {
      await api.updateAnnouncement(a.id, { is_active: !a.is_active });
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <div className="rise">
      <PageHeader title={t('annTitle')} subtitle={t('annSub')}>
        <Button onClick={() => setEditing({ ...EMPTY })} icon={<IconPlus size={17} />}>
          {t('addAnn')}
        </Button>
      </PageHeader>

      <div style={{ display: 'grid', gap: 15 }}>
        {rows === null ? (
          <Card>
            <div className="spinner" />
          </Card>
        ) : rows.length === 0 ? (
          <Card>
            <Empty
              icon={<IconMegaphone size={24} />}
              title={t('noAnns')}
              sub={t('noAnnsSub')}
              action={
                <Button onClick={() => setEditing({ ...EMPTY })} icon={<IconPlus size={17} />}>
                  {t('addAnn')}
                </Button>
              }
            />
          </Card>
        ) : (
          rows.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center gap-12 wrap">
                <span
                  className={`stat__icon ${a.tone === 'red' ? 'stat__icon--red' : a.tone === 'green' ? '' : 'stat__icon--amber'}`}
                  style={{ width: 40, height: 40 }}
                >
                  <IconMegaphone size={19} />
                </span>

                <div className="grow" style={{ minWidth: 200 }}>
                  <div className="fw-700">{a.body_en || a.body_ar}</div>
                  <div className="fs-13 c-muted" dir="rtl" style={{ textAlign: 'start' }}>
                    {a.body_ar || a.body_en}
                  </div>
                </div>

                <Badgeish tone={a.tone}>
                  {t(
                    a.tone === 'red'
                      ? 'toneRed'
                      : a.tone === 'green'
                        ? 'toneGreen'
                        : 'toneNeutral',
                  )}
                </Badgeish>

                <Switch
                  checked={a.is_active}
                  onChange={() => toggle(a)}
                  label={a.is_active ? t('enabled') : t('disabled')}
                />

                <div className="table__actions">
                  <Button
                    variant="soft"
                    size="sm"
                    aria-label={t('editAnn')}
                    onClick={() => setEditing({ ...a })}
                    icon={<IconEdit size={15} />}
                  />
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    aria-label={t('annDeleted')}
                    onClick={() => setRemoving(a)}
                    icon={<IconTrash size={15} />}
                  />
                </div>
              </div>

              {/* live preview of the top bar */}
              <div className={`ticker ticker--${a.tone}`} style={{ margin: '16px 0 0', width: '100%' }}>
                <span className="ticker__pulse" />
                <div className="ticker__viewport">
                  <div className="ticker__item">{a.body_en || a.body_ar}</div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <AnnForm ann={editing} onClose={() => setEditing(null)} onSave={save} busy={busy} />

      <Confirm
        open={!!removing}
        title={t('annDeleted')}
        message={removing?.body_en ?? ''}
        confirmLabel={t('annDeleted')}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        busy={busy}
      />
    </div>
  );
}

function Badgeish({ tone, children }) {
  return <span className={`badge badge--${tone === 'green' ? 'green' : tone === 'red' ? 'red' : 'amber'}`}>{children}</span>;
}

function AnnForm({ ann, onClose, onSave, busy }) {
  const { t, lang } = useI18n();
  const [form, setForm] = useState(ann ?? EMPTY);

  useEffect(() => {
    setForm(ann ?? EMPTY);
  }, [ann]);

  const tones = [
    { value: 'green', label: t('toneGreen') },
    { value: 'red', label: t('toneRed'), danger: true },
    { value: 'neutral', label: t('toneNeutral') },
  ];

  return (
    <Modal
      open={!!ann}
      onClose={onClose}
      title={ann?.id ? t('editAnn') : t('addAnn')}
      subtitle={t('annSub')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t('cancel')}
          </Button>
          <Button onClick={() => onSave(form)} loading={busy}>
            {t('save')}
          </Button>
        </>
      }
    >
      <div className="form">
        <Field label={t('bodyEnglish')} required>
          <input
            className="input"
            dir="ltr"
            value={form.body_en ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, body_en: e.target.value }))}
            autoFocus
          />
        </Field>

        <Field label={t('bodyArabic')} required>
          <input
            className="input"
            dir="rtl"
            value={form.body_ar ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, body_ar: e.target.value }))}
          />
        </Field>

        <Field label={t('tone')}>
          <Segment options={tones} value={form.tone} onChange={(v) => setForm((f) => ({ ...f, tone: v }))} ariaLabel={t('tone')} />
        </Field>

        <Field label={t('orderLabel')}>
          <input
            className="input mono"
            type="number"
            min="0"
            value={form.sort_order ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
          />
        </Field>

        <Switch
          checked={form.is_active !== false}
          onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
          label={t('enabled')}
        />
      </div>
    </Modal>
  );
}

/* =========================================================
   Preferences — language + currency
   ========================================================= */

export function Settings() {
  const { t, lang, setLang } = useI18n();
  const [currency, setCurrency] = useCurrency();

  return (
    <div className="rise">
      <PageHeader title={t('settingsTitle')} subtitle={t('settingsSub')} />

      <div style={{ display: 'grid', gap: 15, maxWidth: 620 }}>
        <Card title={t('appearance')}>
          <div className="form">
            <Field label={t('languageLabel')}>
              <select
                className="select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </Field>

            <Field label={t('currencyLabel')} hint={t('currencyHint')}>
              <select
                className="select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {lang === 'ar' ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
