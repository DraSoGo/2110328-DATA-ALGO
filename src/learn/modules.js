import bellmanFord from './algo/bellman-ford.js';
import bfs from './algo/bfs.js';
import binarySearch from './algo/binary-search.js';
import binomial from './algo/binomial.js';
import complexity from './algo/complexity.js';
import connectedComponents from './algo/connected-components.js';
import dfs from './algo/dfs.js';
import dijkstra from './algo/dijkstra.js';
import fibonacciMemo from './algo/fibonacci-memo.js';
import fibonacciTable from './algo/fibonacci-table.js';
import floydWarshall from './algo/floyd-warshall.js';
import fractionalKnapsack from './algo/fractional-knapsack.js';
import heapSort from './algo/heap-sort.js';
import insertionSort from './algo/insertion-sort.js';
import intervalScheduling from './algo/interval-scheduling.js';
import knapsack from './algo/knapsack.js';
import kruskal from './algo/kruskal.js';
import lcs from './algo/lcs.js';
import maxSubarray from './algo/max-subarray.js';
import mergeSort from './algo/merge-sort.js';
import nQueen from './algo/n-queen.js';
import permutation from './algo/permutation.js';
import prim from './algo/prim.js';
import quickSort from './algo/quick-sort.js';
import selectionSort from './algo/selection-sort.js';
import topologicalSort from './algo/topological-sort.js';
import treeTraversal from './algo/tree-traversal.js';
import avl from './data/avl.js';
import bst from './data/bst.js';
import hashTable from './data/hash-table.js';
import list from './data/list.js';
import map from './data/map.js';
import pair from './data/pair.js';
import priorityQueue from './data/priority-queue.js';
import queue from './data/queue.js';
import set from './data/set.js';
import stack from './data/stack.js';
import vector from './data/vector.js';

export const MODULES = [
  vector,
  pair,
  list,
  stack,
  queue,
  priorityQueue,
  bst,
  avl,
  set,
  map,
  hashTable,
  complexity,
  permutation,
  nQueen,
  insertionSort,
  selectionSort,
  mergeSort,
  quickSort,
  heapSort,
  binarySearch,
  maxSubarray,
  fibonacciMemo,
  fibonacciTable,
  binomial,
  lcs,
  knapsack,
  bfs,
  dfs,
  topologicalSort,
  connectedComponents,
  treeTraversal,
  intervalScheduling,
  fractionalKnapsack,
  prim,
  kruskal,
  dijkstra,
  bellmanFord,
  floydWarshall,
];

export function modulesFor(side) {
  return MODULES.filter((module) => module.side === side);
}

export function findModule(side, id) {
  return MODULES.find((module) => module.side === side && module.id === id) || null;
}
