// MeshCore keys with a chosen prefix, made in the browser. A MeshCore private key (prv.key) is the
// SHA-512 of a 32-byte Ed25519 seed with the first half clamped (lib/ed25519/keypair.c:6-12 in
// meshcore-dev/MeshCore); its public key is the standard Ed25519 public key of that seed. The firmware refuses a
// public key that starts with 00 or FF (src/Identity.cpp:71). Nothing here touches the network.

export const isPrefix = (hex) => /^([0-9a-f]{2}){1,2}$/i.test(hex) && !/^(00|ff)/i.test(hex);

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

// The 32-byte seed inside a PKCS#8 export of an Ed25519 private key: its last 32 bytes.
const seedOf = (pkcs8) => new Uint8Array(pkcs8).slice(-32);

export async function privateKeyFromSeed(subtle, seed) {
  const h = new Uint8Array(await subtle.digest('SHA-512', seed));
  h[0] &= 248; h[31] &= 63; h[31] |= 64;
  return toHex(h);
}

export const supported = async (subtle) => {
  try { await subtle.generateKey({ name: 'Ed25519' }, true, ['sign']); return true; } catch { return false; }
};

// Tries keys in batches until the public key starts with prefix. onProgress(tries) runs after each batch and
// may return false to stop. Resolves to { publicKey, privateKey, tries }, or null when stopped.
export async function findKey(subtle, prefix, onProgress = () => true, batch = 256) {
  const want = prefix.toLowerCase();
  let tries = 0;
  for (;;) {
    const pairs = await Promise.all(Array.from({ length: batch }, () => subtle.generateKey({ name: 'Ed25519' }, true, ['sign'])));
    const pubs = await Promise.all(pairs.map((p) => subtle.exportKey('raw', p.publicKey)));
    for (let i = 0; i < pairs.length; i++) {
      tries++;
      const pub = toHex(new Uint8Array(pubs[i]));
      if (pub.startsWith(want)) {
        const seed = seedOf(await subtle.exportKey('pkcs8', pairs[i].privateKey));
        return { publicKey: pub, privateKey: await privateKeyFromSeed(subtle, seed), tries };
      }
    }
    if (onProgress(tries) === false) return null;
  }
}
