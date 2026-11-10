// Course headers shown on the Code reading pages. Each id has src/learn/code/<id>.js
// (annotations, loaded on demand) and src/learn/code/headers/<file> (the source text).
export const HEADERS = [
  { id: 'vector', module: 'vector', file: 'vector.h', group: 'Sequence', className: 'CP::vector<T>' },
  { id: 'list', module: 'list', file: 'list.h', group: 'Sequence', className: 'CP::list<T>' },
  { id: 'pair', module: 'pair', file: 'pair.h', group: 'Sequence', className: 'CP::pair<T1, T2>' },
  { id: 'stack', module: 'stack', file: 'stack.h', group: 'Adaptor', className: 'CP::stack<T>' },
  { id: 'queue', module: 'queue', file: 'queue.h', group: 'Adaptor', className: 'CP::queue<T>' },
  { id: 'priority-queue', module: 'priority-queue', file: 'priority_queue.h', group: 'Adaptor', className: 'CP::priority_queue<T>' },
  { id: 'map-bst', module: 'bst', file: 'map_bst.h', group: 'Tree', className: 'CP::map_bst<K, V>' },
  { id: 'map-avl', module: 'avl', file: 'map_avl.h', group: 'Tree', className: 'CP::map_avl<K, V>' },
  { id: 'set', module: 'set', file: 'set.h', group: 'Tree', className: 'CP::set<K> (red-black)' },
  { id: 'map', module: 'map', file: 'map.h', group: 'Tree', className: 'CP::map<K, V> (red-black)' },
  { id: 'unordered-map', module: 'hash-table', file: 'unordered_map.h', group: 'Hash', className: 'CP::unordered_map<K, V>' },
];

export function findHeader(id) {
  return HEADERS.find((item) => item.id === id) || null;
}

// The course header behind a Data Learning module (null for std:: only modules such as set and map).
export function headerForModule(moduleId) {
  return HEADERS.find((item) => item.module === moduleId) || null;
}

export function loadAnnotations(id) {
  return import(`./${id}.js`).then((mod) => mod.default);
}
