// One meeting with its repeat, for "Add to calendar" without JavaScript: /meetings/one/<id>.ics.
import { feedText } from '../../../../web/js/meetings-core.js';
import { allMeetings, buildDate } from '../../../lib/meetings.mjs';

export function getStaticPaths() {
  return allMeetings().map((meeting) => ({ params: { id: meeting.id }, props: { meeting } }));
}

export function GET({ props }) {
  return new Response(feedText(props.meeting.name, [props.meeting], buildDate()));
}
