// The meetings on /community/, on what changes with the day: the line on each group card and the next meetings.
import { todayIn, nextDate, lastDate, addDays } from './meetings-core.js';
import { refreshRow, pageLocale } from './meeting-row.js';

const SHOWN = 3;
// A last meeting says a group is active only for so long.
const LAST_MEETING_DAYS = 180;
const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
const locale = pageLocale();
const longDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
const inUtc = (date) => new Date(`${date}T12:00:00Z`);

for (const line of document.querySelectorAll('[data-group-meetings]')) {
  const meetings = JSON.parse(line.dataset.groupMeetings);
  const next = meetings.map((m) => ({ m, at: nextDate(m, today) })).filter((x) => x.at).sort((a, b) => a.at.localeCompare(b.at))[0];
  const last = meetings.map((m) => lastDate(m, today)).filter(Boolean).sort().pop();
  const label = document.createElement('span');
  label.className = 'label';
  if (next) {
    label.textContent = line.dataset.nextLabel;
    const a = document.createElement('a');
    a.href = `${line.dataset.page}#meeting-${next.m.id}`;
    a.textContent = `${longDate.format(inUtc(next.at))}, ${next.m.time}`;
    line.replaceChildren(label, a);
  } else if (last && last >= addDays(today, -LAST_MEETING_DAYS)) {
    label.textContent = line.dataset.lastLabel;
    line.replaceChildren(label, longDate.format(inUtc(last)));
  }
  line.hidden = !next && !(last && last >= addDays(today, -LAST_MEETING_DAYS));
}

const list = document.querySelector('[data-next-meetings]');
if (list) {
  const rows = [...list.querySelectorAll('[data-meeting]')].map((el) => ({ el, m: JSON.parse(el.dataset.meeting) }))
    .map((r) => ({ ...r, at: refreshRow(r.el, r.m, today, locale) }));
  const upcoming = rows.filter((r) => r.at).sort((a, b) => a.at.localeCompare(b.at) || a.m.time.localeCompare(b.m.time));
  for (const r of rows) r.el.hidden = true;
  upcoming.slice(0, SHOWN).forEach((r) => { r.el.hidden = false; list.append(r.el); });
  list.closest('section').hidden = !upcoming.length;
}
