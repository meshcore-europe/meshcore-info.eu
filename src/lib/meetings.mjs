// The meetings of data/meetings.yaml for the page and the feeds: each with the name of who runs it, sorted by its
// next date as of the build. There is a feed for all of Europe, for every country and for every local group,
// also while it has no meetings, so that a visitor can subscribe before the first one is listed.
import { loadData, BASE_URL, languageOf, contentFile, hasString } from './site.mjs';
import { nextDate, lastDate, placeInMonth } from '../../web/js/meetings-core.js';

// Read once: every group card of every language asks for these.
let groupList, meetingList;
const groups = () => (groupList ??= loadData('communities'));
const rawMeetings = () => (meetingList ??= loadData('meetings'));
const groupOf = (id) => groups().find((g) => g.id === id);

// Who runs it, as the visitor reads it: the group, or the name the meeting gives.
function withOrganiser(m) {
  const group = groupOf(m.group || m.listed_by);
  return { ...m, organiser: group ? group.name : m.who, link: m.link || group?.links?.find((l) => l.url)?.url };
}

let resolved;
export const allMeetings = () => (resolved ??= rawMeetings().map(withOrganiser));

export const buildDate = () => new Date().toISOString().slice(0, 10);

export function upcoming(today = buildDate()) {
  return allMeetings().map((m) => ({ meeting: m, next: nextDate(m, today) })).filter((r) => r.next)
    .sort((a, b) => a.next.localeCompare(b.next) || a.meeting.time.localeCompare(b.meeting.time));
}

// Every country a meeting can come from through the form, and any other that has a group or a meeting.
export const feedCountries = () => [...new Set([...Object.keys(loadData('meeting_zones')), ...[...groups(), ...rawMeetings()].map((x) => x.country.toUpperCase())])]
  .filter((cc) => hasString(`country_${cc.toLowerCase()}`)).sort();
export const feedGroups = () => [...groups()].sort((a, b) => a.name.localeCompare(b.name));

const inCountry = (cc) => allMeetings().filter((m) => m.country.toUpperCase() === cc);
const ofGroup = (id) => allMeetings().filter((m) => m.group === id || m.listed_by === id);

const feedUrl = (path) => new URL(`/meetings/${path}.ics`, BASE_URL).href;
export const europeUrl = () => feedUrl('europe');
export const countryUrl = (cc) => feedUrl(cc.toLowerCase());
export const groupUrl = (id) => feedUrl(`groups/${id}`);
export const oneUrl = (id) => `/meetings/one/${id}.ics`;

export const europeFeed = () => ({ title: 'MeshCore meetings in Europe', meetings: allMeetings() });
export const countryFeed = (cc) => ({ title: `MeshCore meetings: ${cc}`, meetings: inCountry(cc) });
export const groupFeed = (group) => ({ title: `MeshCore meetings: ${group.name}`, meetings: ofGroup(group.id) });

// The string key for how often a meeting repeats.
export const repeatKey = (m) => (!m.repeat ? 'meetings_repeat_once' : m.repeat === 'weekly' ? 'meetings_repeat_weekly' : `meetings_repeat_monthly_${placeInMonth(m.date)}`);

// Dates in British English for English, as on the rest of the site.
export const localeOf = (lang) => (lang === 'en' ? 'en-GB' : languageOf(lang).locale);

// The meetings page in a language, with the English page until it is translated.
export const meetingsPage = (lang) => `/${contentFile(lang, 'meetings') ? lang : 'en'}/meetings/`;

// The next and the last meeting a group runs, as of the build. A meeting it only lists does not count.
export function groupMeetings(id, today = buildDate()) {
  const mine = allMeetings().filter((m) => m.group === id);
  const next = mine.map((m) => ({ m, at: nextDate(m, today) })).filter((x) => x.at).sort((a, b) => a.at.localeCompare(b.at))[0] || null;
  const last = mine.map((m) => lastDate(m, today)).filter(Boolean).sort().pop() || null;
  return { mine, next, last };
}

// A meeting's place on the map: that of its way in person, or that of its group. Without such a way it has none.
export function meetingSpot(m) {
  const way = m.join.find((w) => w.kind === 'in_person');
  if (!way) return null;
  return way.location || groups().find((g) => g.id === m.group)?.location || null;
}
