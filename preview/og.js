// The social cards: every card has a day and a night picture, and the night one is
// served from evening to morning in Central European time, as the home film turns from morning to evening.
// An app that shows a link keeps the card it fetched first, so a link shared at night keeps the night card.
export const NIGHT_FROM = 19;   // hour the night card starts, Europe/Amsterdam
export const NIGHT_UNTIL = 7;   // hour the day card returns

export function isNight(date) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Amsterdam', hour: '2-digit', hourCycle: 'h23' }).format(date));
  return hour >= NIGHT_FROM || hour < NIGHT_UNTIL;
}

// /media/og/<page>.jpg at night becomes /media/og/<page>-night.jpg; any other path stays as it is.
export function cardPath(path, date) {
  const m = path.match(/^\/media\/og\/([\w-]+?)\.jpg$/);
  if (!m || m[1].endsWith('-night') || !isNight(date)) return path;
  return `/media/og/${m[1]}-night.jpg`;
}

// The pages name their card on meshcore-info.eu; on staging the card has to come from staging itself, or a
// link shared from staging shows the production site's card (which does not exist before the launch).
export function onOrigin(content, origin) {
  return content.replace(/^https:\/\/meshcore-info\.eu(?=\/)/, origin);
}
