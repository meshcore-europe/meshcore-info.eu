// Hugo's heading ids in Markdown: "## Legal limits {#legal}" becomes <h2 id="legal">Legal limits</h2>.
// Content links to sections only through these ids (CONTRIBUTING.md), so the syntax stays.
import { visit } from 'unist-util-visit';

const ID = /\s*\{#([A-Za-z0-9_-]+)\}\s*$/;

export function remarkHeadingIds() {
  return (tree) => {
    visit(tree, 'heading', (node) => {
      const last = node.children[node.children.length - 1];
      if (!last || last.type !== 'text') return;
      const m = ID.exec(last.value);
      if (!m) return;
      last.value = last.value.slice(0, m.index);
      node.data = { ...node.data, id: m[1], hProperties: { ...(node.data && node.data.hProperties), id: m[1] } };
    });
  };
}
