// The next meetings on the home. The build writes them as they stood that day; here they move on to today's next
// dates, so a site that has not been published for a while never lists a meeting that is over.
import { nextDate, todayIn } from './meetings-core.js';

const list = document.querySelector('[data-home-meetings]');
if (list) {
  const meetings = JSON.parse(list.dataset.meetings);
  const kinds = JSON.parse(list.dataset.kinds);
  const format = new Intl.DateTimeFormat(list.dataset.locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const rows = meetings
    .map((meeting) => ({ meeting, next: nextDate(meeting, todayIn(meeting.timezone)) }))
    .filter((row) => row.next)
    .sort((a, b) => a.next.localeCompare(b.next) || a.meeting.time.localeCompare(b.meeting.time))
    .slice(0, Number(list.dataset.shown));
  list.replaceChildren(...rows.map(({ meeting, next }) => {
    const row = document.createElement('li');
    const when = document.createElement('time');
    when.className = 'mono';
    when.dateTime = next;
    when.textContent = format.format(new Date(`${next}T12:00:00Z`));
    const text = document.createElement('span');
    const name = document.createElement('b');
    name.textContent = meeting.name;
    const how = document.createElement('small');
    how.textContent = [...meeting.join.map((way) => kinds[way.kind]), meeting.country.toUpperCase()].join(' · ');
    text.append(name, how);
    row.append(when, text);
    return row;
  }));
}
