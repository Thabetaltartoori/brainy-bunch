import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useI18n } from '../i18n.jsx';
import { formatMoneyShort, formatToday, useCurrency } from '../format.js';
import { Avatar, Button } from './ui.jsx';
import {
  IconDashboard,
  IconGlobe,
  IconLogout,
  IconMegaphone,
  IconMenu,
  IconMoney,
  IconNote,
  IconStaff,
  IconStudents,
} from '../icons.jsx';

/* =========================================================
   The dynamic top label.
   Rotates through: admin announcements, live financial figures
   and the current date. Tone follows the message, so an urgent
   announcement turns the whole bar red.
   ========================================================= */

function Ticker({ items }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (items.length < 2) return undefined;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % items.length), 5200);
    return () => clearInterval(timer.current);
  }, [items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (!items.length) return null;
  const current = items[index] ?? items[0];

  return (
    <div className={`ticker ticker--${current.tone ?? 'green'}`} aria-live="polite">
      <span className="ticker__pulse" />
      <div className="ticker__viewport">
        {/* key remount replays the slide-in animation on every change */}
        <div key={`${index}-${current.text}`} className="ticker__item">
          {current.text}
        </div>
      </div>
      {items.length > 1 && (
        <div className="ticker__dots">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              className={`ticker__dot ${i === index ? 'ticker__dot--on' : ''}`}
              aria-label={it.text}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Sidebar
   ========================================================= */

function Sidebar({ user, stats, open, onClose, onSignOut }) {
  const { t } = useI18n();
  const location = useLocation();

  const groups = useMemo(() => {
    const main = [
      { to: '/', label: t('dashboard'), Icon: IconDashboard, exact: true },
      { to: '/students', label: t('students'), Icon: IconStudents },
    ];
    const manage = [
      { to: '/payments', label: t('payments'), Icon: IconMoney },
      { to: '/notes', label: t('notes'), Icon: IconNote },
    ];
    // Parents have no reason to see the staff directory or the banner editor.
    const system = [];
    if (user.role === 'admin' || user.role === 'teacher') {
      system.push({ to: '/staff', label: t('staff'), Icon: IconStaff });
    }
    if (user.role === 'admin') {
      system.push({ to: '/announcements', label: t('settings'), Icon: IconMegaphone });
    }
    return [
      { label: t('navMain'), items: main },
      { label: t('navManage'), items: manage },
      ...(system.length ? [{ label: t('navSystem'), items: system }] : []),
    ];
  }, [t, user.role]);

  // Close the drawer whenever the route changes on small screens.
  useEffect(() => onClose?.(), [location.pathname]);

  return (
    <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="brand">
        <span className="brand__mark">BB</span>
        <div>
          <div className="brand__name">{t('brandName')}</div>
          <div className="brand__sub">{t('brandSub')}</div>
        </div>
      </div>

      <nav className="nav">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="nav__label">{group.label}</div>
            {group.items.map(({ to, label, Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `nav__item ${isActive ? 'nav__item--active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
                {to === '/payments' && stats?.unpaidThisMonth > 0 && user.role !== 'parent' && (
                  <span className="nav__badge">{stats.unpaidThisMonth}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__foot">
        <div className="userchip">
          <Avatar name={user.full_name} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="userchip__name">{user.full_name}</div>
            <div className="userchip__role">
              {t(user.role === 'admin' ? 'roleAdmin' : user.role === 'teacher' ? 'roleTeacher' : 'roleParent')}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            title={t('signOut')}
            aria-label={t('signOut')}
            style={{ background: 'transparent', border: 0, color: 'var(--g-300)', padding: 6 }}
          >
            <IconLogout size={17} />
          </Button>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   Shell
   ========================================================= */

export function Shell({ user, stats, announcements, title, subtitle, onSignOut, children }) {
  const { t, lang, toggleLang } = useI18n();
  const [currency] = useCurrency();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  const tickerItems = useMemo(() => {
    const items = (announcements ?? [])
      .filter((a) => a.is_active)
      .map((a) => ({ text: a[lang === 'ar' ? 'body_ar' : 'body_en'], tone: a.tone }));

    // Live figures, only where they mean something (staff, not parents).
    if (user.role !== 'parent' && stats) {
      if (stats.unpaidThisMonth > 0) {
        items.push({
          text:
            lang === 'ar'
              ? `${stats.unpaidThisMonth} طالب لم يسدد رسوم هذا الشهر بعد`
              : `${stats.unpaidThisMonth} students have not paid this month yet`,
          tone: 'red',
        });
      } else {
        items.push({
          text:
            lang === 'ar'
              ? 'جميع الرسوم مستوفاة هذا الشهر — أحسنتم 👏'
              : 'All tuition settled this month — well done 👏',
          tone: 'green',
        });
      }
      if (stats.totalOutstanding > 0) {
        items.push({
          text:
            lang === 'ar'
              ? `المبلغ المتبقي على المدرسة: ${formatMoneyShort(stats.totalOutstanding, currency, lang)}`
              : `Still outstanding: ${formatMoneyShort(stats.totalOutstanding, currency, lang)}`,
          tone: 'neutral',
        });
      }
    }

    items.push({ text: formatToday(lang), tone: 'neutral' });
    return items;
  }, [announcements, stats, lang, user.role, currency]);

  // Reset the drawer whenever navigation happens.
  useEffect(() => setDrawer(false), [location.pathname]);

  return (
    <div className="shell min-h-screen bg-slate-50 text-slate-900">
      {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

      <Sidebar
        user={user}
        stats={stats}
        open={drawer}
        onClose={() => setDrawer(false)}
        onSignOut={onSignOut}
      />

      <div className="main">
        <header className="topbar">
          <div className="topbar__row">
            <Button
              variant="ghost"
              size="sm"
              className="menu-btn"
              onClick={() => setDrawer((d) => !d)}
              aria-label="menu"
              icon={<IconMenu size={19} />}
            />

            <div className="topbar__title">
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>

            <div className="topbar__actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleLang}
                icon={<IconGlobe size={16} />}
                title={t('langName')}
              >
                {t('langName')}
              </Button>
            </div>

            {/* the label sits beside the title, not under it, so it stays
                a small accent instead of taking over the whole bar */}
            <Ticker items={tickerItems} />
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}

/* =========================================================
   Page header helper for use *inside* a page.
   ========================================================= */

export function PageHeader({ title, subtitle, badge, children }) {
  return (
    <div className="section__head">
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {title}
          {badge}
        </h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="section__head-actions">{children}</div>}
    </div>
  );
}
