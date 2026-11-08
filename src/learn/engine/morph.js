const SVG_TYPE = 'image/svg+xml';

function syncAttributes(target, source) {
  for (const { name } of [...target.attributes]) if (!source.hasAttribute(name)) target.removeAttribute(name);
  for (const { name, value } of [...source.attributes]) if (target.getAttribute(name) !== value) target.setAttribute(name, value);
}

function syncTree(target, source) {
  syncAttributes(target, source);
  const current = [...target.children];
  const next = [...source.children];
  if (!current.length && !next.length) {
    if (target.textContent !== source.textContent) target.textContent = source.textContent;
    return;
  }
  if (current.length !== next.length || current.some((child, index) => child.tagName !== next[index].tagName)) {
    target.replaceChildren(...[...source.childNodes].map((node) => document.importNode(node, true)));
    return;
  }
  current.forEach((child, index) => syncTree(child, next[index]));
}

function syncKeyed(target, source) {
  const existing = new Map([...target.children].map((child) => [child.getAttribute('data-key'), child]));
  for (const child of source.children) {
    const key = child.getAttribute('data-key');
    const match = existing.get(key);
    if (match) {
      syncTree(match, child);
      existing.delete(key);
    } else {
      target.appendChild(document.importNode(child, true));
    }
  }
  existing.forEach((child) => child.remove());
}

// Replace the SVG in `host` with `markup`. With `animate`, elements that share a
// data-key are updated in place so CSS transitions can move them.
export function patchSvg(host, markup, { animate = false } = {}) {
  const next = new DOMParser().parseFromString(markup, SVG_TYPE).documentElement;
  const current = host.querySelector(':scope > svg');
  const layerOf = (svg, name) => [...svg.children].find((child) => child.getAttribute('class') === name);
  const layerNames = (svg) => [...svg.children].map((layer) => layer.getAttribute('class')).join('|');
  if (!animate || !current || layerNames(current) !== layerNames(next)) {
    host.replaceChildren(document.importNode(next, true));
    return;
  }
  syncAttributes(current, next);
  for (const layer of [...next.children]) {
    const name = layer.getAttribute('class');
    if (name === 'layer-items') syncKeyed(layerOf(current, name), layer);
    else layerOf(current, name).replaceWith(document.importNode(layer, true));
  }
}
