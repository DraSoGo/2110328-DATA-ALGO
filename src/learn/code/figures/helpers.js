// Shared helpers for Code-tab figures.
export const upTo = (n) => Array.from({ length: Math.max(0, n) }, (_, i) => i);
export const allKeys = (state) => state.nodes.map((node) => node.key);
