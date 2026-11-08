// Course slides shipped in /slides, and which slides belong to which Learning module.

export const SLIDES = [
  { side: 'data', file: '01_Pair_Vector_Set_Map.pdf', title: 'Pair, vector, set, map' },
  { side: 'data', file: '05_Stack.pdf', title: 'Stack' },
  { side: 'data', file: '06_Stack_Queue.pdf', title: 'Stack and queue' },
  { side: 'data', file: '08_Class.pdf', title: 'Class' },
  { side: 'data', file: '12_Complexity.pdf', title: 'Complexity' },
  { side: 'data', file: '13_Priority_Queue.pdf', title: 'Priority queue' },
  { side: 'data', file: '14_Linked_List.pdf', title: 'Linked list' },
  { side: 'data', file: '15_Binary_Tree.pdf', title: 'Binary tree' },
  { side: 'data', file: '17_AVL_Tree.pdf', title: 'AVL tree' },
  { side: 'data', file: '18_Hash_Table.pdf', title: 'Hash table' },
  { side: 'algo', file: '00_Intro.pdf', title: 'Introduction' },
  { side: 'algo', file: '01_brute_force.pdf', title: 'Brute force' },
  { side: 'algo', file: '02_sorting.pdf', title: 'Sorting' },
  { side: 'algo', file: '02_sorting-2.pdf', title: 'Sorting 2' },
  { side: 'algo', file: '03_recursive_and_analysis.pdf', title: 'Recursion and analysis' },
  { side: 'algo', file: '04_divide_and_conquer.pdf', title: 'Divide and conquer' },
  { side: 'algo', file: '05_dynamic_programming.pdf', title: 'Dynamic programming' },
  { side: 'algo', file: '06_Graph.pdf', title: 'Graph' },
  { side: 'algo', file: '07_Greedy.pdf', title: 'Greedy' },
  { side: 'algo', file: '08_shortest_path.pdf', title: 'Shortest path' },
];

// Specific modules first; anything else falls back to its group.
const BY_MODULE = {
  'data/vector': ['01_Pair_Vector_Set_Map.pdf'],
  'data/pair': ['01_Pair_Vector_Set_Map.pdf'],
  'data/set': ['01_Pair_Vector_Set_Map.pdf'],
  'data/map': ['01_Pair_Vector_Set_Map.pdf'],
  'data/list': ['14_Linked_List.pdf'],
  'data/stack': ['05_Stack.pdf', '06_Stack_Queue.pdf'],
  'data/queue': ['06_Stack_Queue.pdf'],
  'data/priority-queue': ['13_Priority_Queue.pdf'],
  'data/bst': ['15_Binary_Tree.pdf'],
  'data/avl': ['17_AVL_Tree.pdf'],
  'data/hash-table': ['18_Hash_Table.pdf'],
  'algo/complexity': ['12_Complexity.pdf', '00_Intro.pdf', '03_recursive_and_analysis.pdf'],
  'algo/fibonacci-memo': ['05_dynamic_programming.pdf', '03_recursive_and_analysis.pdf'],
};

const BY_GROUP = {
  'data/Sequence': ['01_Pair_Vector_Set_Map.pdf'],
  'data/Adaptor': ['06_Stack_Queue.pdf'],
  'data/Tree': ['15_Binary_Tree.pdf'],
  'data/Hash': ['18_Hash_Table.pdf'],
  'algo/Analysis': ['00_Intro.pdf', '03_recursive_and_analysis.pdf'],
  'algo/Brute force': ['01_brute_force.pdf'],
  'algo/Sort': ['02_sorting.pdf', '02_sorting-2.pdf'],
  'algo/Divide and conquer': ['04_divide_and_conquer.pdf'],
  'algo/Dynamic programming': ['05_dynamic_programming.pdf'],
  'algo/Graph': ['06_Graph.pdf'],
  'algo/Tree traversal': ['15_Binary_Tree.pdf'],
  'algo/Greedy': ['07_Greedy.pdf'],
  'algo/Minimum spanning tree': ['07_Greedy.pdf', '06_Graph.pdf'],
  'algo/Shortest path': ['08_shortest_path.pdf'],
};

export function slidePath(slide) {
  return `slides/${slide.side}/${slide.file}`;
}

export function slidesFor(module) {
  const files = BY_MODULE[`${module.side}/${module.id}`] || BY_GROUP[`${module.side}/${module.group}`] || [];
  return files.map((file) => SLIDES.find((slide) => slide.file === file)).filter(Boolean);
}
