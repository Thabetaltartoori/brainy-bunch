import { useI18n } from '../i18n.jsx';
import { api } from '../api.js';
import { Field } from './ui.jsx';

/**
 * Creating a parent for a child.
 *
 * A parent could only be attached to a student by choosing one that already
 * existed, so adding a child meant a trip to the staff list to make the
 * account, then back again to link it. These two pieces let both the student
 * form and the "assign a parent" dialog do it in the place the person is
 * already looking at.
 *
 * The account is named after the child by default, which is what makes it
 * recognisable in the staff list, where a family can hold several accounts.
 */

/** A starting email address made from the child's name. */
export function suggestEmail(name) {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '.')
    .replace(/^[.]+|[.]+$/g, '');
  // A name written in Arabic slugs to nothing an address can use, so start
  // from "parent" and let the director finish it.
  return /[a-z]/.test(slug) ? `${slug}@brainybunch.school` : 'parent@brainybunch.school';
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Field-level checks, so nothing is sent only for the server to refuse it. */
export function validateParent({ name, email, password }, t) {
  const errors = {};
  if (!String(name ?? '').trim()) errors.name = t('fieldRequired');
  if (!EMAIL_RE.test(String(email ?? '').trim())) errors.email = t('fieldRequired');
  if (String(password ?? '').length < 8) errors.password = t('fieldRequired');
  return errors;
}

/**
 * Make the account, then attach it to the student.
 *
 * These are two writes and there is no transaction across them, so the
 * account can end up made but not attached. That is reported rather than
 * thrown: the account is real and usable, and telling the caller the whole
 * thing failed would have them go and make a second one.
 */
export async function createParentAndAttach({ studentId, name, email, password, relation }) {
  const { user } = await api.createUser({
    email: String(email ?? '').trim(),
    password,
    full_name: String(name ?? '').trim(),
    role: 'parent',
    is_active: true,
  });

  let attached = true;
  try {
    await api.assignGuardian(studentId, user.id, relation || null);
  } catch {
    attached = false;
  }
  return { user, attached };
}

/** The three fields, shared by both places that ask for a parent. */
export function ParentFields({ value, onChange, errors, idPrefix = 'parent' }) {
  const { t } = useI18n();
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  return (
    <>
      <Field label={t('fullName')} required error={errors?.name}>
        <input
          id={`${idPrefix}-name`}
          className={`input ${errors?.name ? 'input--error' : ''}`}
          value={value.name ?? ''}
          onChange={set('name')}
          autoComplete="off"
        />
      </Field>

      <Field label={t('email')} required error={errors?.email}>
        <input
          id={`${idPrefix}-email`}
          className={`input ${errors?.email ? 'input--error' : ''}`}
          type="email"
          value={value.email ?? ''}
          onChange={set('email')}
          autoComplete="off"
        />
      </Field>

      <Field
        label={t('password')}
        required
        error={errors?.password}
        hint={t('createParentPasswordHint')}
      >
        <input
          id={`${idPrefix}-password`}
          className={`input ${errors?.password ? 'input--error' : ''}`}
          type="password"
          value={value.password ?? ''}
          onChange={set('password')}
          autoComplete="new-password"
        />
      </Field>
    </>
  );
}
