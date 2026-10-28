// A "#" link after every h2 and h3 that has an id, so a reader can copy a link to that section. It is the
// same link the data pages put after their headings (class anchor). The label names the section, for
// screen readers; the "#" itself is hidden from them.
import { visit } from 'unist-util-visit';
import { t } from './site.mjs';

const toString = (node) => node.type === 'text' ? node.value : (node.children || []).map(toString).join('');

function langOf(file) {
  const m = /(?:^|[\\/])content[\\/]([a-z]{2})[\\/]/.exec(String(file.path || (file.history || [])[0] || ''));
  return m ? m[1] : null;
}

export function rehypeHeadingAnchors() {
  return (tree, file) => {
    const lang = langOf(file);
    if (!lang) return;
    visit(tree, 'element', (node) => {
      if ((node.tagName !== 'h2' && node.tagName !== 'h3') || !node.properties.id) return;
      const text = toString(node).trim();
      node.children.push({ type: 'text', value: ' ' }, {
        type: 'element', tagName: 'a',
        properties: { className: ['anchor'], href: `#${node.properties.id}`, ariaLabel: `${t(lang, 'heading_link')}: ${text}` },
        children: [{ type: 'element', tagName: 'span', properties: { ariaHidden: 'true' }, children: [{ type: 'text', value: '#' }] }],
      });
    });
  };
}
