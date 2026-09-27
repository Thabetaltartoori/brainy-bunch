/**
 * Inline SVG icon set (stroke-based, 24px grid).
 * Inlined rather than pulled from a package so nothing loads twice
 * and every icon inherits currentColor.
 */

const S = ({ children, size = 18, fill = 'none', ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const IconDashboard = (p) => (
  <S {...p}>
    <rect x="3" y="3" width="7.5" height="8.5" rx="2" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="2" />
    <rect x="13.5" y="11" width="7.5" height="10" rx="2" />
    <rect x="3" y="14" width="7.5" height="7" rx="2" />
  </S>
);

export const IconStudents = (p) => (
  <S {...p}>
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
    <circle cx="9" cy="7" r="3.4" />
    <path d="M22 20v-1.5a4 4 0 0 0-3-3.87" />
    <path d="M16 3.6a4 4 0 0 1 0 7" />
  </S>
);

export const IconMoney = (p) => (
  <S {...p}>
    <rect x="2" y="5.5" width="20" height="13" rx="3" />
    <circle cx="12" cy="12" r="2.8" />
    <path d="M6 10v4M18 10v4" />
  </S>
);

export const IconNote = (p) => (
  <S {...p}>
    <path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V9z" />
    <path d="M14 3v4.5A1.5 1.5 0 0 0 15.5 9H20" />
    <path d="M8.5 13.5h7M8.5 17h4.5" />
  </S>
);

export const IconStaff = (p) => (
  <S {...p}>
    <path d="M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="3.4" />
    <path d="M22 20v-2a4 4 0 0 0-3-3.87" />
    <path d="M16.5 3.7a4 4 0 0 1 0 6.6" />
  </S>
);

export const IconMegaphone = (p) => (
  <S {...p}>
    <path d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z" />
    <path d="M14 8.5a4.5 4.5 0 0 1 0 7" />
    <path d="M17.5 5.5a8.5 8.5 0 0 1 0 13" />
  </S>
);

export const IconSettings = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-1 1.47V21a2 2 0 1 1-4 0v-.11a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-1H3a2 2 0 1 1 0-4h.11a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 1-1.47V3a2 2 0 1 1 4 0v.11a1.6 1.6 0 0 0 1 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47 1H21a2 2 0 1 1 0 4h-.11a1.6 1.6 0 0 0-1.47 1z" />
  </S>
);

export const IconPlus = (p) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconEdit = (p) => (
  <S {...p}>
    <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
    <path d="M18.4 2.6a2 2 0 0 1 2.8 2.83L12 14.6l-3.8.8.8-3.8z" />
  </S>
);

export const IconTrash = (p) => (
  <S {...p}>
    <path d="M3.5 6h17" />
    <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6" />
    <path d="M18.5 6l-.8 13.1a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6" />
    <path d="M10 11v5.5M14 11v5.5" />
  </S>
);

export const IconCheck = (p) => (
  <S {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </S>
);

export const IconX = (p) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);

export const IconSearch = (p) => (
  <S {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M20 20l-4.5-4.5" />
  </S>
);

export const IconAlert = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.4v.2" />
  </S>
);

export const IconInfo = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.2" />
  </S>
);

export const IconLock = (p) => (
  <S {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </S>
);

export const IconUnlock = (p) => (
  <S {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 7.6-1.7" />
  </S>
);

export const IconArrowRight = (p) => (
  <S {...p}>
    <path d="M5 12h13M13 6l6 6-6 6" />
  </S>
);

export const IconArrowLeft = (p) => (
  <S {...p}>
    <path d="M19 12H6M11 6l-6 6 6 6" />
  </S>
);

export const IconChevron = (p) => (
  <S {...p}>
    <path d="M9 6l6 6-6 6" />
  </S>
);

export const IconGlobe = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
  </S>
);

export const IconLogout = (p) => (
  <S {...p}>
    <path d="M9.5 21H5.5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 16.5l4.5-4.5L16 7.5" />
    <path d="M20.5 12H9" />
  </S>
);

export const IconTrendUp = (p) => (
  <S {...p}>
    <path d="M22 7l-8.5 8.5-4-4L2 19" />
    <path d="M16 7h6v6" />
  </S>
);

export const IconWallet = (p) => (
  <S {...p}>
    <path d="M20 8V6.5A1.5 1.5 0 0 0 18.5 5H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7" />
    <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </S>
);

export const IconClock = (p) => (
  <S {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </S>
);

export const IconMenu = (p) => (
  <S {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </S>
);

export const IconBook = (p) => (
  <S {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a3 3 0 0 1 3 3v13a2.4 2.4 0 0 0-2.4-2.4H4z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a3 3 0 0 0-3 3v13a2.4 2.4 0 0 1 2.4-2.4H20z" />
  </S>
);

export const IconCalendar = (p) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </S>
);

export const IconSpark = (p) => (
  <S {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </S>
);

export const IconUser = (p) => (
  <S {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </S>
);

export const IconInbox = (p) => (
  <S {...p}>
    <path d="M3 13h4l1.5 3h7L17 13h4" />
    <path d="M5.4 5.5L3 13v5.5A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5V13l-2.4-7.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.9 1.5z" />
  </S>
);

export const IconUsers = (p) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16.5 4.7a3.6 3.6 0 0 1 0 6.9" />
    <path d="M18 14.2A6.5 6.5 0 0 1 21.5 20" />
  </S>
);
