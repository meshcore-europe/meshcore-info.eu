// The dates, calendar files and schedule strip of the meetings, as pure functions (tests/js/meetings.test.mjs).
// The build uses them for the page and the feeds, web/js/meetings.js for what changes with the day.
// A date is a 'YYYY-MM-DD' string in the meeting's own time zone. Its repeat follows from the first date:
// weekly on that weekday, or monthly on that weekday's place in the month (the 2nd Tuesday, or the last one).

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_MS = 864e5;
// How long a repeating meeting stays listed after someone last confirmed it.
export const LISTED_MONTHS = 6;

const toMs = (date) => Date.parse(`${date}T00:00:00Z`);
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (date, days) => fromMs(toMs(date) + days * DAY_MS);
export const weekdayOf = (date) => new Date(toMs(date)).getUTCDay();

// The place of a date's weekday in its month: 1 to 4, or 'last' for a 5th.
export function placeInMonth(date) {
  const n = Math.ceil(new Date(toMs(date)).getUTCDate() / 7);
  return n === 5 ? 'last' : n;
}

function nthWeekday(year, month, place, weekday) {
  if (place === 'last') {
    const end = new Date(Date.UTC(year, month + 1, 0));
    end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() - weekday + 7) % 7));
    return end.toISOString().slice(0, 10);
  }
  const first = new Date(Date.UTC(year, month, 1));
  first.setUTCDate(1 + ((weekday - first.getUTCDay() + 7) % 7) + 7 * (place - 1));
  return first.toISOString().slice(0, 10);
}

// The last date a repeating meeting stays listed.
export function listedUntil(meeting) {
  const d = new Date(toMs(meeting.last_checked));
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + LISTED_MONTHS);
  d.setUTCDate(Math.min(day, new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()));
  return d.toISOString().slice(0, 10);
}

// Up to count dates of a meeting, today or later.
export function datesFrom(meeting, today, count = 1) {
  const { date, repeat } = meeting;
  if (!repeat) return date >= today ? [date] : [];
  const until = listedUntil(meeting);
  const out = [];
  if (repeat === 'weekly') {
    let at = date;
    if (at < today) at = addDays(at, Math.ceil((toMs(today) - toMs(at)) / (7 * DAY_MS)) * 7);
    for (; at <= until && out.length < count; at = addDays(at, 7)) out.push(at);
    return out;
  }
  const place = placeInMonth(date);
  const weekday = weekdayOf(date);
  const start = new Date(toMs(date > today ? date : today));
  for (let i = 0; out.length < count; i++) {
    const at = nthWeekday(start.getUTCFullYear(), start.getUTCMonth() + i, place, weekday);
    if (at > until) break;
    if (at >= date && at >= today) out.push(at);
  }
  return out;
}

// The last date of a meeting before today, or null.
export function lastDate(meeting, today) {
  const { date, repeat } = meeting;
  if (date >= today) return null;
  if (!repeat) return date;
  const end = addDays(listedUntil(meeting) < today ? addDays(listedUntil(meeting), 1) : today, -1);
  if (repeat === 'weekly') return addDays(date, Math.floor((toMs(end) - toMs(date)) / (7 * DAY_MS)) * 7);
  const place = placeInMonth(date);
  const weekday = weekdayOf(date);
  const at = new Date(toMs(end));
  for (let i = 0; i < 24; i++) {
    const hit = nthWeekday(at.getUTCFullYear(), at.getUTCMonth() - i, place, weekday);
    if (hit <= end && hit >= date) return hit;
  }
  return date;
}

export const nextDate = (meeting, today) => datesFrom(meeting, today, 1)[0] || null;

// Today in a time zone, as a date.
export const todayIn = (timeZone, now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

// A time zone's distance from UTC in minutes at a moment.
function offsetAt(timeZone, ms) {
  const name = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'longOffset' }).formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName').value;
  const m = name.match(/([+-])(\d{2}):(\d{2})/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
}

// The moment a local date and time happens in a time zone.
export function momentOf(date, time, timeZone) {
  const local = Date.parse(`${date}T${time}:00Z`);
  const first = local - offsetAt(timeZone, local) * 6e4;
  return new Date(local - offsetAt(timeZone, first) * 6e4);
}

// The form on the meetings page: what is still missing, and the answers as the address of the issue form.

const isLink = (s) => /^https:\/\/\S+\.\S+/.test(s);

// The key of what is still missing, or null.
export function formProblem(v, today) {
  if (v.group === 'new' && !v.new_group) return 'need_new_group';
  if (v.group === 'new' && !isLink(v.links)) return 'need_new_link';
  if (v.group === 'none' && !v.who) return 'need_who';
  if (v.group === 'none' && !isLink(v.page)) return 'need_page';
  if (!v.name || !(v.place || v.place_online || v.place_channel) || !v.time || !v.languages) return 'need_place';
  if (v.place_online && !isLink(v.place_online)) return 'need_online';
  if (!v.first || (v.rule === 'once' && v.first < today)) return 'need_date';
  if (!v.open) return 'need_open';
  return null;
}

export function issueQuery(v) {
  const rule = { once: 'Only this date', weekly: 'Every week', monthly: 'Every month' }[v.rule];
  const isNew = v.group === 'new', isNone = v.group === 'none';
  const fields = {
    template: 'add-meeting.yml', title: `Add meeting: ${v.name}`, group: isNew || isNone ? '' : v.groupName,
    new_group: isNew ? v.new_group : '', region: isNew ? v.region : '', links: isNew ? v.links : '', who: isNone ? v.who : '', page: isNone ? v.page : '',
    country: isNew || isNone ? v.country : '', name: v.name, place_in_person: v.place, place_online: v.place_online, place_channel: v.place_channel, first: v.first, time: v.time, rule, languages: v.languages,
  };
  return new URLSearchParams(Object.entries(fields).filter(([, value]) => value)).toString();
}

// The calendar file (iCalendar, RFC 5545).

const escapeText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (date) => date.replace(/-/g, '');

// Lines of at most 75 bytes, a longer one goes on after a line break and a space.
function fold(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let part = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(part);
      part = '';
      bytes = 0;
    }
    part += ch;
    bytes += size;
  }
  parts.push(part);
  return parts.join('\r\n ');
}

function offsetText(minutes) {
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}${String(abs % 60).padStart(2, '0')}`;
}

// A time zone with the European clock change: the last Sunday of March and of October, at 01:00 UTC.
function timeZoneLines(timeZone) {
  const standard = offsetAt(timeZone, Date.UTC(2026, 0, 15));
  const summer = offsetAt(timeZone, Date.UTC(2026, 6, 15));
  const clock = (minutes) => `${String(Math.floor((60 + minutes) / 60)).padStart(2, '0')}0000`;
  const part = (kind, date, time, from, to, rule) => [`BEGIN:${kind}`, `DTSTART:${date}T${time}`, `TZOFFSETFROM:${offsetText(from)}`, `TZOFFSETTO:${offsetText(to)}`, ...(rule ? [`RRULE:FREQ=YEARLY;BYMONTH=${rule};BYDAY=-1SU`] : []), `END:${kind}`];
  return ['BEGIN:VTIMEZONE', `TZID:${timeZone}`,
    ...(standard === summer ? part('STANDARD', '19700101', '000000', standard, standard)
      : [...part('DAYLIGHT', '19700329', clock(standard), standard, summer, 3), ...part('STANDARD', '19701025', clock(summer), summer, standard, 10)]),
    'END:VTIMEZONE'];
}

// What a way to join shows: its place, or else the site its link goes to.
export const wayText = (way) => way.place || new URL(way.url).hostname;

const WAY_NAMES = { in_person: 'In person', online: 'Online', channel: 'On a channel' };

function eventLines(meeting, stamp, onlyDate) {
  const { id, name, date, time, timezone, repeat, join, link, organiser } = meeting;
  const start = onlyDate || date;
  // A calendar has one location: the way in person when there is one. The other ways go in the description.
  const main = join.find((w) => w.kind === 'in_person') || join[0];
  const place = wayText(main);
  const url = main.url || join.find((w) => w.url)?.url;
  const others = join.filter((w) => w !== main).map((w) => `${WAY_NAMES[w.kind]}: ${[w.place, w.url].filter(Boolean).join(' ')}`);
  const details = [organiser, ...others, main.url || (others.length ? '' : link)].filter(Boolean).join('\n');
  const rule = onlyDate || !repeat ? null
    : `FREQ=${repeat === 'weekly' ? 'WEEKLY' : 'MONTHLY'};BYDAY=${repeat === 'weekly' ? '' : placeInMonth(date) === 'last' ? '-1' : placeInMonth(date)}${BYDAY[weekdayOf(date)]};UNTIL=${compact(listedUntil(meeting))}T235959Z`;
  return ['BEGIN:VEVENT', `UID:${id}${onlyDate ? `-${onlyDate}` : ''}@meshcore-info.eu`, `DTSTAMP:${compact(stamp)}T000000Z`,
    `DTSTART;TZID=${timezone}:${compact(start)}T${time.replace(':', '')}00`, 'DURATION:PT2H', ...(rule ? [`RRULE:${rule}`] : []),
    `SUMMARY:${escapeText(name)}`, `LOCATION:${escapeText(place)}`, ...(details ? [`DESCRIPTION:${escapeText(details)}`] : []),
    ...(url || link ? [`URL:${url || link}`] : []), 'END:VEVENT'];
}

// A feed: every meeting with its repeat. An empty one holds a time zone, because a calendar needs at least 1 part.
export function feedText(title, meetings, stamp) {
  const zones = [...new Set(meetings.map((m) => m.timezone))];
  return wrap(title, zones.length ? zones : ['Europe/Brussels'], meetings.flatMap((m) => eventLines(m, stamp)), ['REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H']);
}

// A file for one date of a meeting.
export const singleText = (meeting, date, stamp) => wrap(meeting.name, [meeting.timezone], eventLines(meeting, stamp, date), []);

function wrap(title, zones, events, extra) {
  return [...['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//meshcore-info.eu//Meetings//EN', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:${escapeText(title)}`, ...extra],
    ...zones.flatMap(timeZoneLines), ...events, 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}

// The schedule strip: 8 weeks from the Monday of this week across, a row per kind of meeting down.

export const STRIP_WEEKS = 8;
export const KINDS = ['in_person', 'online', 'channel'];
const CELL = 10;
const ROW = 24;

export const stripStart = (today) => addDays(today, -((weekdayOf(today) + 6) % 7));

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A shape per kind, so the strip reads without colour.
function mark(kind, x, y) {
  if (kind === 'online') return `<circle class="meeting-mark-open" cx="${x}" cy="${y}" r="4"/>`;
  if (kind === 'channel') return `<path d="M${x} ${y - 5.5}L${x + 5.5} ${y}L${x} ${y + 5.5}L${x - 5.5} ${y}Z"/>`;
  return `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="1"/>`;
}

// meetings: { id, join, name, date, repeat, last_checked }. A meeting has a mark in the row of each way to join. label(date) writes a date for the tooltip.
export function stripSvg(meetings, today, label, ariaLabel) {
  const start = stripStart(today);
  const days = STRIP_WEEKS * 7;
  const end = addDays(start, days - 1);
  const rows = KINDS.map((kind, row) => {
    const y = ROW * row + ROW / 2;
    const marks = meetings.filter((m) => m.join.some((w) => w.kind === kind)).flatMap((m) => datesFrom(m, today, days).filter((d) => d <= end).map((d) => {
      const x = (Math.round((toMs(d) - toMs(start)) / DAY_MS) + 0.5) * CELL;
      return `<a href="#meeting-${xml(m.id)}"><title>${xml(`${label(d)}: ${m.name}`)}</title>${mark(kind, x, y)}</a>`;
    }));
    return `<rect class="meeting-lane" x="0" y="${ROW * row + 1}" width="${days * CELL}" height="${ROW - 2}"/>${marks.join('')}`;
  }).join('');
  const weeks = Array.from({ length: STRIP_WEEKS }, (_, w) => `<line class="meeting-week" x1="${w * 7 * CELL}" x2="${w * 7 * CELL}" y1="0" y2="${ROW * KINDS.length}"/>`).join('');
  const now = (Math.round((toMs(today) - toMs(start)) / DAY_MS) + 0.5) * CELL;
  return `<svg viewBox="0 0 ${days * CELL} ${ROW * KINDS.length}" role="group" aria-label="${xml(ariaLabel)}">${rows}${weeks}<line class="meeting-today" x1="${now}" x2="${now}" y1="0" y2="${ROW * KINDS.length}"/></svg>`;
}
