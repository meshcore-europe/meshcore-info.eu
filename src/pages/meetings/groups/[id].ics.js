// The calendar feed of every local group: /meetings/groups/<id>.ics, also before its first meeting.
import { feedText } from '../../../../web/js/meetings-core.js';
import { buildDate, feedGroups, groupFeed } from '../../../lib/meetings.mjs';

export function getStaticPaths() {
  return feedGroups().map((group) => ({ params: { id: group.id }, props: { group } }));
}

export function GET({ props }) {
  const { title, meetings } = groupFeed(props.group);
  return new Response(feedText(title, meetings, buildDate()));
}
