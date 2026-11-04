// The calendar feeds for all of Europe and for every country: /meetings/europe.ics, /meetings/de.ics.
import { feedText } from '../../../web/js/meetings-core.js';
import { buildDate, europeFeed, countryFeed, feedCountries } from '../../lib/meetings.mjs';

export function getStaticPaths() {
  return [{ params: { file: 'europe' } }, ...feedCountries().map((cc) => ({ params: { file: cc.toLowerCase() } }))];
}

export function GET({ params }) {
  const { title, meetings } = params.file === 'europe' ? europeFeed() : countryFeed(params.file.toUpperCase());
  return new Response(feedText(title, meetings, buildDate()));
}
