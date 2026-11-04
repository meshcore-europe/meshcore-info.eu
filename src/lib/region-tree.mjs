// The region trees the Regions block on /guides/settings/ draws (src/components/RegionTree.astro), built from
// `region put <name> [<parent>]` lines: a line without a parent starts a tree, a line with one hangs its region
// under that parent. A local group can run two trees side by side, so the result is a list of roots.
// YOUR_PROVINCE is the province picker, YOUR_CITY the town field and YOUR_BAND the radio preset picker.

export const PLACEHOLDER = { YOUR_PROVINCE: 'province', YOUR_CITY: 'town', YOUR_BAND: 'band' };

// The `region put` lines among an area's repeater commands, as { code, parent }.
export function regionPuts(changes) {
  return (changes || []).flatMap((c) => c.commands || []).filter((l) => l.startsWith('region put '))
    .map((l) => { const [, , code, parent] = l.trim().split(/\s+/); return { code, parent: parent || null }; });
}

// The puts as a list of trees: { code, kind, children }. A child whose parent is not put before it starts a tree
// of its own, so the block still shows every region; tools/validate_data.py refuses such data.
export function treesFrom(puts) {
  const nodes = new Map();
  const roots = [];
  for (const { code, parent } of puts) {
    const node = { code, kind: PLACEHOLDER[code] || 'region', children: [] };
    nodes.set(code, node);
    const up = parent && nodes.get(parent);
    (up ? up.children : roots).push(node);
  }
  return roots;
}

// The general chain for a country without region commands of its own: Europe, a group of countries where there is
// one, the country, then the radio preset picker, the province picker and the town, as fixed levels (the country is
// always the third box, with or without a group above it). `bands` and `regions` say whether the pickers show.
export function generalTree({ root, group, cc, bands, regions }) {
  const town = { code: 'YOUR_CITY', kind: 'town', children: [], level: 4 };
  const country = { code: cc, kind: 'region', children: [], level: 2 };
  if (bands) country.children.push({ code: 'YOUR_BAND', kind: 'band', children: [], level: 3 });
  country.children.push(regions ? { code: 'YOUR_PROVINCE', kind: 'province', children: [town], level: 3 } : town);
  const top = { code: root, kind: 'region', children: [], level: 0 };
  if (group) top.children.push({ code: group, kind: 'region', children: [country], level: 1 });
  else top.children.push(country);
  return [top];
}

// The commands of the general chain, one `region put` per line (the town's line shows once a town is typed).
export function generalPuts({ root, group, cc, bands, regions }) {
  const chain = [root, ...(group ? [group] : []), cc];
  return [`region put ${chain[0]}`, ...chain.slice(1).map((code, i) => `region put ${code} ${chain[i]}`),
    ...(bands ? [`region put YOUR_BAND ${cc}`] : []), ...(regions ? [`region put YOUR_PROVINCE ${cc}`] : []),
    `region put YOUR_CITY ${regions ? 'YOUR_PROVINCE' : cc}`, 'region save'];
}

// The same chain as one `region def` line (firmware 1.16 or newer); the town is added by the page once typed.
export function generalDef({ root, group, cc, bands, regions }) {
  return `region def ${[root, ...(group ? [group] : []), cc].join(' ')}${bands ? ` YOUR_BAND|${cc}` : ''}${regions ? ' YOUR_PROVINCE' : ''}`;
}
