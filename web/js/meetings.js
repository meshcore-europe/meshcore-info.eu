// The meetings page, on what changes with the day: the build wrote the list as it stood then, and this script
// takes passed dates off it, moves each row to its next date and draws the strip again. It also runs the country
// and feed choice, the copy button, the visitor's own time and the file for one date.
import { singleText, stripSvg, stripStart, addDays, todayIn, STRIP_WEEKS } from './meetings-core.js';
import { refreshRow, pageLocale } from './meeting-row.js';

const root = document.querySelector('[data-meetings]');

if (root) {
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const locale = pageLocale();
  const list = root.querySelector('[data-meeting-list]');
  const rows = [...list.querySelectorAll('[data-meeting]')].map((el) => ({ el, meeting: JSON.parse(el.dataset.meeting), next: null }));
  const strip = root.querySelector('[data-meeting-strip]');
  const weeks = root.querySelector('[data-meeting-weeks]');
  const empty = root.querySelector('[data-meeting-empty]');
  const emptyGroup = root.querySelector('[data-meeting-empty-group]');
  const picker = root.querySelector('[data-feed-pick]');
  const url = root.querySelector('[data-feed-url]');
  const copy = root.querySelector('[data-feed-copy]');
  const chips = root.querySelector('[data-meeting-chips]');
  const inUtc = (date) => new Date(`${date}T12:00:00Z`);
  const shortDate = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  let choice = picker.value;

  const chosen = (row) => {
    const opt = picker.selectedOptions[0];
    if (opt.dataset.kind === 'country') return row.meeting.country === choice;
    if (opt.dataset.kind === 'group') return row.meeting.group === choice || row.meeting.listed_by === choice;
    return true;
  };

  function dates() {
    for (const row of rows) {
      row.next = refreshRow(row.el, row.meeting, today, locale);
      if (!row.next) row.el.hidden = true;
    }
    rows.filter((r) => r.next).sort((a, b) => a.next.localeCompare(b.next) || a.meeting.time.localeCompare(b.meeting.time)).forEach((r) => list.append(r.el));
  }

  function show() {
    const shown = rows.filter((r) => r.next && chosen(r));
    for (const row of rows) row.el.hidden = !row.next || !chosen(row);
    const kind = picker.selectedOptions[0].dataset.kind;
    empty.hidden = shown.length > 0 || kind === 'group';
    emptyGroup.hidden = shown.length > 0 || kind !== 'group';
    url.textContent = picker.selectedOptions[0].dataset.url;
    strip.innerHTML = stripSvg(shown.map((r) => r.meeting), today, (d) => shortDate.format(inUtc(d)), strip.dataset.label);
    for (const chip of chips.querySelectorAll('button')) chip.setAttribute('aria-pressed', String(chip.dataset.value === choice));
  }

  // The week starts above the strip: the day, and the month where one starts.
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayOnly = new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'UTC' });
  weeks.replaceChildren(...Array.from({ length: STRIP_WEEKS }, (_, w) => {
    const date = addDays(stripStart(today), w * 7);
    const span = document.createElement('span');
    span.textContent = (w === 0 || Number(date.slice(8)) <= 7 ? dayMonth : dayOnly).format(inUtc(date));
    return span;
  }));

  picker.addEventListener('change', () => { choice = picker.value; show(); });
  chips.addEventListener('click', (e) => {
    const chip = e.target.closest('button');
    if (!chip) return;
    picker.value = chip.dataset.value;
    choice = picker.value;
    show();
  });

  copy.addEventListener('click', () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(url.textContent).then(() => {
      const label = copy.textContent;
      copy.textContent = copy.dataset.done;
      setTimeout(() => { copy.textContent = label; }, 2000);
    }, () => { /* permission denied: the link stays on the page to select */ });
  });

  // The file for the date on the row; without this script the link gets the meeting with its repeat.
  list.addEventListener('click', (e) => {
    const link = e.target.closest('[data-add-calendar]');
    if (!link) return;
    const row = rows.find((r) => r.el.contains(link));
    if (!row?.next) return;
    const blob = new Blob([singleText(row.meeting, row.next, today)], { type: 'text/calendar;charset=utf-8' });
    link.href = URL.createObjectURL(blob);
    link.download = `${row.meeting.id}-${row.next}.ics`;
  });

  // A link from a group card opens with that group's feed.
  const asked = new URLSearchParams(location.search).get('feed');
  if (asked && [...picker.options].some((o) => o.value === asked)) {
    picker.value = asked;
    choice = asked;
  }

  dates();
  chips.hidden = false;
  picker.closest('label').hidden = false;
  copy.hidden = !navigator.clipboard;
  show();
}
