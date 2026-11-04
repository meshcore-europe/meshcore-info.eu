// Moves a meeting row to its next date in the visitor's browser, with the visitor's own time for an online meeting.
import { nextDate, momentOf } from './meetings-core.js';

const inUtc = (date) => new Date(`${date}T12:00:00Z`);

export const pageLocale = () => (document.documentElement.lang === 'en' ? 'en-GB' : document.documentElement.lang);

// The next date of the row, or null when it has none.
export function refreshRow(el, meeting, today, locale) {
  const next = nextDate(meeting, today);
  if (!next) return null;
  const time = el.querySelector('time');
  time.dateTime = `${next}T${meeting.time}`;
  time.textContent = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(inUtc(next));
  const own = el.querySelector('[data-own-time]');
  if (own) {
    own.textContent = own.dataset.template.replace('{time}', new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(momentOf(next, meeting.time, meeting.timezone)));
    own.hidden = false;
  }
  return next;
}
