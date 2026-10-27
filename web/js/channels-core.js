// The channels guide (/guides/channels/): the pure parts, tested in tests/js/channels.test.mjs.
// A #channel's key is the first 16 bytes of the SHA-256 of its name with the # (checked against all 2,615
// #channels the MeshCore Analyzer listed on 13 October 2026).

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export const isHashtag = (name) => /^#\S+$/.test(name);

export async function keyFor(subtle, name) {
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(name));
  return toHex(new Uint8Array(digest).slice(0, 16));
}

// The channels whose key anyone can know (the #channels and Public), most messages first.
export const openChannels = (channels) => channels
  .filter((c) => !c.encrypted && (isHashtag(c.name) || c.name.toLowerCase() === 'public'))
  .sort((a, b) => b.messageCount - a.messageCount);

// Every word typed must be in the name or one of the regions.
export const matches = (c, query) => {
  const text = [c.name, ...(c.scopes || [])].join(' ').toLowerCase();
  return query.toLowerCase().split(/\s+/).every((w) => text.includes(w));
};
