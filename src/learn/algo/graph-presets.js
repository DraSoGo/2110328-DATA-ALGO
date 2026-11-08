import { nodesOf } from './graph-common.js';

// Preset graphs shared by the graph modules. Coordinates are on a rough
// 400 x 300 board; the renderer scales them into its canvas.

const preset = (id, name, directed, nodes, edges) => ({ id, name, directed, nodes: nodesOf(nodes), edges });

export const UNWEIGHTED_UNDIRECTED = [
  preset('tree-cycle', 'Tree with a cycle (7 nodes)', false,
    [['A', 200, 30], ['B', 100, 110], ['C', 300, 110], ['D', 50, 210], ['E', 150, 210], ['F', 300, 210], ['G', 225, 280]],
    [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['E', 'G'], ['F', 'G']]),
  preset('grid', 'Grid (6 nodes)', false,
    [['A', 60, 80], ['B', 200, 80], ['C', 340, 80], ['D', 60, 230], ['E', 200, 230], ['F', 340, 230]],
    [['A', 'B'], ['B', 'C'], ['D', 'E'], ['E', 'F'], ['A', 'D'], ['B', 'E'], ['C', 'F']]),
  preset('split', 'Two separate parts (8 nodes)', false,
    [['A', 50, 70], ['B', 150, 40], ['C', 100, 170], ['D', 220, 130], ['E', 280, 50], ['F', 360, 110], ['G', 300, 200], ['H', 370, 260]],
    [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['E', 'F'], ['F', 'G'], ['G', 'H'], ['E', 'G']]),
];

export const COMPONENT_GRAPHS = [
  preset('three', 'Three groups (8 nodes)', false,
    [['A', 50, 60], ['B', 150, 100], ['C', 60, 190], ['D', 230, 40], ['E', 330, 90], ['F', 230, 200], ['G', 340, 230], ['H', 270, 275]],
    [['A', 'B'], ['B', 'C'], ['D', 'E'], ['F', 'G'], ['G', 'H'], ['F', 'H']]),
  preset('isolated', 'Isolated nodes (7 nodes)', false,
    [['A', 50, 60], ['B', 160, 40], ['C', 120, 150], ['D', 260, 90], ['E', 340, 170], ['F', 60, 250], ['G', 250, 250]],
    [['A', 'B'], ['B', 'C'], ['D', 'E']]),
  UNWEIGHTED_UNDIRECTED[0],
];

export const TOPO_GRAPHS = [
  preset('tasks', 'Task DAG (8 nodes)', true,
    [['A', 40, 60], ['B', 40, 220], ['C', 150, 60], ['D', 150, 220], ['E', 260, 90], ['F', 260, 250], ['G', 370, 90], ['H', 370, 250]],
    [['A', 'C'], ['A', 'D'], ['B', 'D'], ['C', 'E'], ['D', 'E'], ['D', 'F'], ['E', 'G'], ['F', 'G'], ['F', 'H']]),
  preset('diamond', 'Diamond DAG (6 nodes)', true,
    [['A', 40, 150], ['B', 150, 50], ['C', 150, 250], ['D', 260, 150], ['E', 360, 60], ['F', 360, 250]],
    [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['D', 'E'], ['C', 'F'], ['E', 'F']]),
  preset('cyclic', 'Contains a cycle (6 nodes)', true,
    [['A', 40, 150], ['B', 150, 60], ['C', 270, 60], ['D', 210, 220], ['E', 120, 260], ['F', 360, 260]],
    [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'B'], ['A', 'E'], ['E', 'F']]),
];

export const MST_GRAPHS = [
  preset('course', 'Course-style (7 nodes)', false,
    [['A', 200, 30], ['B', 80, 100], ['C', 330, 100], ['D', 120, 200], ['E', 300, 200], ['F', 40, 270], ['G', 220, 270]],
    [['A', 'B', 2], ['A', 'C', 1], ['A', 'D', 3], ['B', 'D', 2], ['C', 'E', 3], ['D', 'E', 3], ['D', 'G', 1], ['E', 'G', 2], ['F', 'G', 4], ['D', 'F', 4]]),
  preset('ring', 'Ring with chords (6 nodes)', false,
    [['A', 100, 40], ['B', 300, 40], ['C', 370, 150], ['D', 300, 260], ['E', 100, 260], ['F', 30, 150]],
    [['A', 'B', 7], ['B', 'C', 5], ['C', 'D', 8], ['D', 'E', 9], ['E', 'F', 6], ['F', 'A', 4], ['A', 'D', 12], ['B', 'E', 3]]),
  preset('dense', 'Dense (8 nodes)', false,
    [['A', 40, 150], ['B', 130, 50], ['C', 270, 50], ['D', 360, 150], ['E', 270, 260], ['F', 130, 260], ['G', 200, 150], ['H', 200, 100]],
    [['A', 'B', 10], ['B', 'C', 6], ['C', 'D', 9], ['D', 'E', 7], ['E', 'F', 12], ['F', 'A', 8], ['G', 'A', 5], ['G', 'D', 4], ['G', 'E', 11], ['G', 'F', 2], ['H', 'B', 3], ['H', 'C', 13], ['H', 'G', 14], ['B', 'F', 15]]),
];

export const DIJKSTRA_GRAPHS = [
  preset('roads', 'Directed roads (6 nodes)', true,
    [['A', 40, 150], ['B', 150, 50], ['C', 150, 250], ['D', 270, 50], ['E', 360, 150], ['F', 270, 250]],
    [['A', 'B', 7], ['A', 'C', 9], ['A', 'F', 14], ['B', 'C', 10], ['B', 'D', 15], ['C', 'D', 11], ['C', 'F', 2], ['D', 'E', 6], ['F', 'E', 9]]),
  preset('campus', 'Undirected campus (7 nodes)', false,
    [['A', 200, 30], ['B', 70, 100], ['C', 330, 100], ['D', 120, 200], ['E', 300, 200], ['F', 50, 270], ['G', 220, 270]],
    [['A', 'B', 4], ['A', 'C', 2], ['B', 'C', 5], ['B', 'D', 10], ['C', 'E', 3], ['D', 'E', 4], ['D', 'F', 11], ['E', 'G', 8], ['F', 'G', 6]]),
  preset('unreachable', 'Unreachable node (6 nodes)', true,
    [['A', 40, 150], ['B', 160, 50], ['C', 160, 250], ['D', 290, 150], ['E', 360, 50], ['F', 360, 250]],
    [['A', 'B', 3], ['A', 'C', 5], ['B', 'C', 1], ['B', 'D', 8], ['C', 'D', 4], ['E', 'D', 2], ['E', 'F', 6]]),
];

export const BELLMAN_GRAPHS = [
  preset('neg-edge', 'Negative edges (5 nodes)', true,
    [['A', 40, 150], ['B', 160, 50], ['C', 280, 50], ['D', 160, 250], ['E', 330, 220]],
    [['A', 'B', 6], ['A', 'D', 7], ['B', 'C', 5], ['B', 'D', 8], ['B', 'E', -4], ['C', 'B', -2], ['D', 'C', -3], ['D', 'E', 9], ['E', 'C', 7], ['E', 'A', 2]]),
  preset('neg-cycle', 'Negative cycle (6 nodes)', true,
    [['A', 30, 150], ['B', 130, 150], ['C', 230, 50], ['D', 230, 250], ['E', 340, 250], ['F', 370, 130]],
    [['A', 'B', 4], ['B', 'C', 3], ['C', 'D', 2], ['D', 'B', -6], ['D', 'E', 5], ['E', 'F', 1]]),
  preset('unreachable', 'Unreachable nodes (6 nodes)', true,
    [['A', 40, 80], ['B', 170, 40], ['C', 170, 180], ['D', 320, 110], ['E', 330, 260], ['F', 190, 270]],
    [['A', 'B', 3], ['A', 'C', 5], ['B', 'C', -2], ['C', 'D', 4], ['E', 'D', 1], ['E', 'F', 2]]),
];

export const FLOYD_GRAPHS = [
  preset('five', 'Directed (5 nodes)', true,
    [['A', 40, 150], ['B', 170, 40], ['C', 170, 260], ['D', 300, 70], ['E', 350, 230]],
    [['A', 'B', 3], ['A', 'C', 8], ['A', 'E', -4], ['B', 'D', 1], ['B', 'E', 7], ['C', 'B', 4], ['D', 'A', 2], ['D', 'C', -5], ['E', 'D', 6]]),
  preset('neg-cycle', 'Negative cycle (4 nodes)', true,
    [['A', 60, 60], ['B', 300, 60], ['C', 180, 220], ['D', 360, 250]],
    [['A', 'B', 1], ['B', 'C', -3], ['C', 'A', 1], ['C', 'D', 2]]),
  preset('sparse', 'Sparse, some unreachable (6 nodes)', true,
    [['A', 40, 60], ['B', 160, 40], ['C', 280, 60], ['D', 360, 150], ['E', 90, 240], ['F', 250, 250]],
    [['A', 'B', 2], ['B', 'C', 3], ['C', 'D', 1], ['D', 'B', 2], ['E', 'F', 4], ['F', 'E', 1]]),
];

export const graphField = (presets, { weighted, minWeight = 0, maxWeight = 20, name = 'g', label = 'Graph' } = {}) => ({
  name, label, kind: 'graph', weighted, minWeight, maxWeight, maxEdges: 14, presets, default: presets[0].id,
});

export const startField = (extra = {}) => ({ name: 'start', label: 'start', kind: 'node', graph: 'g', default: 'A', ...extra });
