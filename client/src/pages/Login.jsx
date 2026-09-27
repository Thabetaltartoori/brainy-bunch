import { useState } from 'react';

import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { Button, Field } from '../components/ui.jsx';
import { IconAlert, IconGlobe, IconLock, IconNote, IconStudents, IconWallet } from '../icons.jsx';

export function Login({ onSignedIn }) {
  const { t, lang, toggleLang } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError('');

    if (!email.trim() || !password) {
      setError(t('fieldRequired'));
      return;
    }

    setBusy(true);
    try {
      const { user } = await api.login(email.trim(), password);
      onSignedIn(user);
    } catch (err) {
      setError(
        err.code === 'OFFLINE' ? t('offline') : err.status === 401 ? t('badCreds') : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth__art">
        <div className="auth__logo">
          <span className="auth__logo-mark">BB</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
              {t('brandName')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--g-300)', letterSpacing: '0.05em' }}>
              {t('brandSub')}
            </div>
          </div>
        </div>

        <h1 className="auth__headline">{t('artHeadline')}</h1>
        <p className="auth__sub">{t('artSub')}</p>

        <div className="auth__points">
          <div className="auth__point">
            <i>
              <IconStudents size={16} />
            </i>
            {t('artPoint1')}
          </div>
          <div className="auth__point">
            <i>
              <IconNote size={16} />
            </i>
            {t('artPoint2')}
          </div>
          <div className="auth__point">
            <i>
              <IconWallet size={16} />
            </i>
            {t('artPoint3')}
          </div>
        </div>
      </div>

      <div className="auth__form-wrap">
        <div className="auth__form">
          <div className="auth__lang">
            <Button variant="ghost" size="sm" onClick={toggleLang} icon={<IconGlobe size={16} />}>
              {t('langName')}
            </Button>
          </div>

          <h2 className="auth__title">{t('loginTitle')}</h2>
          <p className="auth__hint">{t('loginSub')}</p>

          {error && (
            <div className="auth__error" role="alert">
              <IconAlert size={17} />
              <span>{error}</span>
            </div>
          )}

          <form className="form" onSubmit={submit} noValidate>
            <Field label={t('email')} required>
              <input
                className="input"
                type="email"
                autoComplete="username"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@brainybunch.school"
              />
            </Field>

            <Field label={t('password')} required>
              <input
                className={`input ${error ? 'input--error' : ''}`}
                type="password"
                autoComplete="current-password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              block
              loading={busy}
              icon={<IconLock size={17} />}
              className="mt-6"
            >
              {busy ? t('signingIn') : t('signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
