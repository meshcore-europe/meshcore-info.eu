// The form on the meetings page: it shows the next dates of what is filled in, says what is still missing, and opens
// the issue form with the answers filled in. Everything stays in the browser until the visitor opens that form.
import { datesFrom, todayIn, weekdayOf, placeInMonth, issueQuery, formProblem } from './meetings-core.js';
import { pageLocale } from './meeting-row.js';

const root = document.querySelector('[data-meeting-add]');

if (root) {
  const form = root.querySelector('form');
  const f = form.elements;
  const today = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const locale = pageLocale();
  const inUtc = (date) => new Date(`${date}T12:00:00Z`);
  const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
  const data = root.dataset;
  const need = root.querySelector('[data-need]');
  const open = root.querySelector('[data-open-form]');

  // The options of "how often" name the weekday of the first date.
  function repeatLabels(date) {
    const name = weekday.format(inUtc(date));
    const place = placeInMonth(date);
    return { once: data.repeatOnce, weekly: data.repeatWeekly.replace('{weekday}', name), monthly: data[place === 'last' ? 'repeatLast' : `repeatM${place}`].replace('{weekday}', name) };
  }

  function refresh() {
    const kept = f.rule.value || 'monthly';
    const date = f.first.value || today;
    const labels = repeatLabels(date);
    f.rule.replaceChildren(...Object.entries(labels).map(([value, text]) => new Option(text, value)));
    f.rule.value = kept;

    const group = f.group.value;
    for (const el of root.querySelectorAll('[data-only]')) el.hidden = !el.dataset.only.split(' ').includes(group);
    const repeat = f.rule.value === 'once' ? undefined : f.rule.value;
    const dates = datesFrom({ date, repeat, last_checked: today }, today, 3);
    root.querySelector('[data-rule-text]').textContent = `${labels[f.rule.value]}, ${f.time.value}`;
    root.querySelector('[data-dates]').replaceChildren(...(dates.length ? dates : [null]).map((d) => {
      const li = document.createElement('li');
      li.textContent = d ? fullDate.format(inUtc(d)) : data.needDate;
      return li;
    }));

    const listed = group !== 'new' && group !== 'none';
    root.querySelector('[data-feed-text]').textContent = listed ? data.feedGroup : group === 'new' ? data.feedNew : data.feedNone;
    root.querySelector('[data-feed-link]').textContent = `${data.siteFeeds}${listed ? `groups/${group}` : f.country.value.toLowerCase()}.ics`;
    root.querySelector('[data-how]').hidden = group === 'none';

    const values = Object.fromEntries(['group', 'new_group', 'region', 'links', 'who', 'country', 'page', 'name', 'kind', 'place', 'first', 'time', 'rule', 'languages'].map((k) => [k, f[k].value.trim()]));
    values.groupName = listed ? f.group.selectedOptions[0].dataset.name : '';
    values.open = f.open.checked;
    const problem = formProblem(values, today);
    const camel = problem && problem.replace(/_(\w)/g, (_, c) => c.toUpperCase());
    need.textContent = problem ? data[camel] : '';
    need.hidden = !problem;
    if (problem) open.removeAttribute('href');
    else open.href = `${data.form}?${issueQuery(values)}`;
    open.classList.toggle('is-off', Boolean(problem));
  }

  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  form.addEventListener('submit', (e) => e.preventDefault());
  root.querySelector('[data-no-script]').hidden = true;
  root.querySelector('[data-with-script]').hidden = false;
  f.first.min = today;
  refresh();
}
