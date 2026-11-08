import { renderArray } from './array.js';
import { renderArrays } from './arrays.js';
import { renderBuckets } from './buckets.js';
import { renderColumn } from './column.js';
import { renderGraph } from './graph.js';
import { renderHeap } from './heap.js';
import { renderLinked } from './linked.js';
import { renderTable } from './table.js';
import { renderTimeline } from './timeline.js';
import { renderTree } from './tree.js';

export const RENDERERS = {
  array: renderArray,
  arrays: renderArrays,
  buckets: renderBuckets,
  column: renderColumn,
  graph: renderGraph,
  heap: renderHeap,
  linked: renderLinked,
  table: renderTable,
  timeline: renderTimeline,
  tree: renderTree,
};
