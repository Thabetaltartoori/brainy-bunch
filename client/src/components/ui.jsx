import { Component, useEffect, useRef, useState } from 'react';

import { useI18n } from '../i18n.jsx';
import { initials, toneFor } from '../format.js';
import { IconCheck, IconX, IconAlert, IconInfo } from '../icons.jsx';

/* =========================================================
   Button — the animated pill. `loading` shows a spinner and
   blocks clicks without changing the button's width.
   ========================================================= */

export function Button({
  variant = 'primary',
  size,
  block,
  loading = false,
  icon,
  children,
  className = '',
  ...rest
}) {
  const classes = [
    'btn',
    variant !== 'primary' ? `btn--${variant}` : '',
    size ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    !children ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="btn__spin" /> : icon}
      {children}
    </button>
  );
}

/* =========================================================
   Avatar
   ========================================================= */

const TONES = [
  'linear-gradient(135deg,#2FA46F,#0E6E49)',
  'linear-gradient(135deg,#5CBB8C,#158A5B)',
  'linear-gradient(135deg,#158A5B,#073B27)',
  'linear-gradient(135deg,#8FD0B0,#0E6E49)',
  'linear-gradient(135deg,#0A5538,#0E6E49)',
  'linear-gradient(135deg,#2FA46F,#073B27)',
];

export function Avatar({ name, size, tone, className = '' }) {
  return (
    <span
      className={`avatar ${size ? `avatar--${size}` : ''} ${className}`}
      style={{ background: TONES[toneFor(name ?? tone)] }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* =========================================================
   Badge
   ========================================================= */

export function Badge({ tone = 'neutral', dot, children }) {
  const cls = tone === 'neutral' ? 'badge' : `badge badge--${tone}`;
  return (
    <span className={cls}>
      {dot && <i className="badge__dot" />}
      {children}
    </span>
  );
}

/* =========================================================
   Card
   ========================================================= */

export function Card({ title, subtitle, actions, pad = true, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {(title || actions) && (
        <header className="card__head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="card__head-actions">{actions}</div>}
        </header>
      )}
      {pad ? <div className="card__body">{children}</div> : children}
    </section>
  );
}

/* =========================================================
   Stat tile
   ========================================================= */

export function Stat({ label, value, icon, tone = 'green', foot, percent, danger }) {
  return (
    <div className="stat">
      <div className="stat__top">
        {icon && (
          <span className={`stat__icon ${tone !== 'green' ? `stat__icon--${tone}` : ''}`}>
            {icon}
          </span>
        )}
        <span className="stat__label">{label}</span>
      </div>
      <div className={`stat__value ${danger ? 'stat__value--red' : ''}`}>{value}</div>
      {foot && <div className="stat__foot">{foot}</div>}
      {typeof percent === 'number' && (
        <div className="stat__bar">
          <i className={danger ? 'is-red' : ''} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Empty state
   ========================================================= */

export function Empty({ icon, title, sub, action }) {
  return (
    <div className="empty">
      {icon && <div className="empty__icon">{icon}</div>}
      <h4>{title}</h4>
      {sub && <p>{sub}</p>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  );
}

/* =========================================================
   Spinner / skeletons
   ========================================================= */

export const Spinner = () => <div className="spinner" role="status" aria-label="loading" />;

export const SkeletonRows = ({ rows = 5, height = 15 }) => (
  <div style={{ display: 'grid', gap: 10, padding: 4 }}>
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className="skeleton"
        style={{ height, width: `${100 - i * 7}%`, animationDelay: `${i * 90}ms` }}
      />
    ))}
  </div>
);

/* =========================================================
   Modal — traps focus, closes on Escape / backdrop click
   ========================================================= */

export function Modal({ open, onClose, title, subtitle, footer, wide, children }) {
  const boxRef = useRef(null);
  const closeRef = useRef(onClose);
  const { t } = useI18n();

  // Keep the latest handler without making the effect depend on it, so
  // focus is only moved when the dialog actually opens.
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // move focus into the dialog
    const first = boxRef.current?.querySelector(
      'input,select,textarea,button:not(.modal__close)',
    );
    first?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={boxRef}
      >
        <header className="modal__head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal__close" onClick={onClose} aria-label={t('close')} type="button">
            <IconX size={17} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* =========================================================
   Confirm dialog
   ========================================================= */

export function Confirm({ open, title, message, confirmLabel, onConfirm, onCancel, busy, danger = true }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} type="button">
            {t('cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
            type="button"
          >
            {confirmLabel ?? t('confirm')}
          </Button>
        </>
      }
    >
      <p className="fs-13 c-muted" style={{ lineHeight: 1.65 }}>
        {message}
      </p>
    </Modal>
  );
}

/* =========================================================
   Toasts
   ========================================================= */

let pushToast = null;

export function ToastHost() {
  const [items, setItems] = useState([]);

  // Registered on every render so `toast()` works from any module.
  pushToast = (message, tone = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((x) => x.id !== id)), 3600);
  };

  if (!items.length) return null;

  return (
    <div className="toasts" aria-live="polite">
      {items.map((x) => (
        <div key={x.id} className={`toast ${x.tone === 'error' ? 'toast--error' : ''}`}>
          <span className="toast__icon">
            {x.tone === 'error' ? <IconAlert size={17} /> : <IconCheck size={17} />}
          </span>
          {x.message}
        </div>
      ))}
    </div>
  );
}

/** Fire a toast from anywhere: `toast('Saved')` or `toast('Nope', 'error')`. */
export const toast = (message, tone) => pushToast?.(message, tone);

/* =========================================================
   Form field wrapper
   ========================================================= */

export function Field({ label, hint, required, error, children }) {
  return (
    <label className="field">
      {label && (
        <span className="field__label">
          {label}
          {required && <i>*</i>}
        </span>
      )}
      {children}
      {(error || hint) && (
        <span className="field__hint" style={error ? { color: 'var(--r-600)' } : undefined}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

/* =========================================================
   Segmented control
   ========================================================= */

export function Segment({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segment" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={`segment__btn ${o.value === value ? 'segment__btn--on' : ''} ${
            o.danger ? 'is-red' : ''
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   Toggle switch
   ========================================================= */

export function Switch({ checked, onChange, label, hint }) {
  return (
    <div>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track" />
        <span>{label}</span>
      </label>
      {hint && <p className="field__hint mt-6">{hint}</p>}
    </div>
  );
}

/* =========================================================
   Progress meter
   ========================================================= */

export function Meter({ value, max = 100, tone }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="meter">
      <div className="meter__track">
        <div
          className={`meter__fill ${tone ? `meter__fill--${tone}` : ''}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="meter__pct">{Math.round(pct)}%</span>
    </div>
  );
}

/* =========================================================
   Inline error notice
   ========================================================= */

export function Notice({ children, tone = 'info' }) {
  return (
    <div className="auth__error">
      {tone === 'info' ? <IconInfo size={17} /> : <IconAlert size={17} />}
      <span>{children}</span>
    </div>
  );
}

/* =========================================================
   Error boundary
   ========================================================= */

/**
 * Catches a throw during render and shows it instead of a blank page.
 *
 * Without this, one bad value anywhere in a page unmounts the whole tree and
 * leaves a white screen: there is no way back and nothing on screen to say
 * what went wrong. The message is shown verbatim because "something went
 * wrong" on its own tells nobody which value was wrong.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page crashed while rendering:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-page">
        <div>
          <div className="error-page__code">!</div>
          <h2>{this.props.title ?? 'This page could not be shown'}</h2>
          <pre
            style={{
              textAlign: 'start',
              whiteSpace: 'pre-wrap',
              margin: '16px 0 0',
              fontSize: 12,
              opacity: 0.75,
            }}
          >
            {String(this.state.error?.message ?? this.state.error)}
          </pre>
          <Button
            className="mt-16"
            onClick={() => {
              this.setState({ error: null });
              window.location.assign('/');
            }}
          >
            {this.props.backLabel ?? 'Back to the dashboard'}
          </Button>
        </div>
      </div>
    );
  }
}
