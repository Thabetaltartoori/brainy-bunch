import { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import { I18nProvider, useI18n } from './i18n.jsx';
import { api } from './api.js';
import { Shell } from './components/Shell.jsx';
import { Button, Spinner, ToastHost } from './components/ui.jsx';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Students } from './pages/Students.jsx';
import { StudentProfile } from './pages/StudentProfile.jsx';
import { Payments } from './pages/Payments.jsx';
import { Notes } from './pages/Notes.jsx';
import { Staff } from './pages/Staff.jsx';
import { Announcements, Settings } from './pages/Announcements.jsx';

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Root />
        <ToastHost />
      </BrowserRouter>
    </I18nProvider>
  );
}

/* ---------------------------------------------------------------- */

function Root() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [stats, setStats] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  // Restore the session on first paint.
  useEffect(() => {
    let alive = true;
    api
      .me()
      .then(({ user: me }) => {
        if (alive) setUser(me);
      })
      .catch(() => {
        /* not signed in — the login screen handles it */
      })
      .finally(() => {
        if (alive) setBooting(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Banner + dashboard figures, shared by every page. */
  const refresh = useCallback(async () => {
    const [meta, s] = await Promise.allSettled([api.announcements(), api.stats()]);
    if (meta.status === 'fulfilled') setAnnouncements(meta.value.announcements);
    if (s.status === 'fulfilled') setStats(s.value);
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  async function signOut() {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStats(null);
      setAnnouncements([]);
    }
  }

  if (booting) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Spinner />
      </div>
    );
  }

  if (!user) return <Login onSignedIn={setUser} />;

  return (
    <Shell
      user={user}
      stats={stats}
      announcements={announcements}
      onSignOut={signOut}
      title={<Title />}
    >
      <Routes>
        <Route path="/" element={<Dashboard stats={stats} user={user} />} />
        <Route
          path="/students"
          element={<Students user={user} onChanged={refresh} />}
        />
        <Route
          path="/students/:id"
          element={<StudentProfile user={user} onChanged={refresh} />}
        />
        <Route path="/payments" element={<Payments user={user} onChanged={refresh} />} />
        <Route path="/notes" element={<Notes user={user} onChanged={refresh} />} />
        <Route path="/staff" element={<Staff user={user} onChanged={refresh} />} />
        <Route
          path="/announcements"
          element={user.role === 'admin' ? <Announcements onChanged={refresh} /> : <Navigate to="/" replace />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="*"
          element={
            <div className="error-page">
              <div>
                <div className="error-page__code">404</div>
                <h2>{t('somethingWrong')}</h2>
                <Button className="mt-16" onClick={() => window.location.assign('/')}>
                  {t('dashboard')}
                </Button>
              </div>
            </div>
          }
        />
      </Routes>
    </Shell>
  );
}

/** Keeps the top bar title in step with the active route. */
function Title() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  if (pathname.startsWith('/students/')) return t('profile');
  if (pathname === '/students') return t('studentsTitle');
  if (pathname === '/payments') return t('payments');
  if (pathname === '/notes') return t('notes');
  if (pathname === '/staff') return t('staffTitle');
  if (pathname === '/announcements') return t('annTitle');
  if (pathname === '/settings') return t('settingsTitle');
  return t('dashTitle');
}
