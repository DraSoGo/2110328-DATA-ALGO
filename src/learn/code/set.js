// Annotations for set.h. The red-black tree parts are shared with map.js through rbRegions / rbNotes:
// set.h and map.h are the same tree, only the stored data differs (KeyT vs pair<const KeyT, MappedT>).
const b = (en, th) => ({ en, th });

// c = { map, o: variable name in the use snippets, T: the class with int arguments, key: how a node's key is read,
//       copyCtor / dtor: their exact header text }
export function rbRegions(c) {
  const ins = c.map ? `${c.o}.insert({5, 50})` : `${c.o}.insert(5)`;
  const elem = c.map ? 'pair' : 'key';
  const elemTh = c.map ? 'pair' : 'key';
  return [
    c.map
      ? {
        id: 'value-type', match: 'typedef std::pair<const KeyT,MappedT> ValueT;', lines: 1, kind: 'type',
        use: 'CP::map<int,int>::iterator it = m.find(5);\ncout << it->first << it->second;   // it->first is const',
        title: b('ValueT', 'ValueT'),
        what: b('Each node stores a std::pair whose key is const, exactly like std::map::value_type. You can change it->second, but not it->first: the key decides where the node sits in the tree. Because the key is const, erase cannot swap keys the way map_bst.h does; it relinks the successor node instead.', 'แต่ละ node เก็บ std::pair ที่ key เป็น const เหมือน std::map::value_type แก้ it->second ได้แต่แก้ it->first ไม่ได้ เพราะ key เป็นตัวกำหนดตำแหน่งของ node ในต้นไม้ และเพราะ key เป็น const ทำให้ erase สลับ key แบบใน map_bst.h ไม่ได้ จึงต้องย้าย node ตัวถัดไป (successor) มาแทนทั้ง node'),
      }
      : {
        id: 'value-type', match: 'typedef KeyT ValueT;', lines: 1, kind: 'type',
        use: 'CP::set<int>::iterator it = s.find(5);\ncout << *it;   // *it is const int&',
        title: b('ValueT', 'ValueT'),
        what: b('A set stores only keys, so the element type is the key itself. The iterator hands it out as const ValueT&, so *it = 7 does not compile: changing a key in place would break the BST order. To "change" an element, erase it and insert the new value.', 'set เก็บแค่ key ชนิดข้อมูลของสมาชิกจึงเป็น key เอง iterator คืนค่าเป็น const ValueT& ทำให้ *it = 7 คอมไพล์ไม่ผ่าน เพราะถ้าแก้ key ตรง ๆ ลำดับ BST จะพัง ถ้าจะ "แก้" ค่า ให้ erase ตัวเดิมแล้ว insert ค่าใหม่'),
      },
    {
      id: 'color-enum', match: 'enum color_t { RED, BLACK };', lines: 1, kind: 'type',
      use: 'node *n = mRoot;\nif (n->color == RED) { /* ... */ }   // inside the class',
      title: b('enum color_t', 'enum color_t'),
      what: b('The one extra bit a red-black tree keeps per node. The rules: the root is black, a red node never has a red child, and every path from a node down to a NULL link passes the same number of black nodes (NULL links count as black). Together they force height <= 2 log2(n + 1).', 'ข้อมูลเพิ่ม 1 บิตต่อ node ของต้นไม้แดงดำ กฎคือ รากเป็นสีดำ, node แดงไม่มีลูกแดง และทุกเส้นทางจาก node หนึ่งลงไปถึงลิงก์ NULL ผ่าน node ดำจำนวนเท่ากัน (ลิงก์ NULL นับเป็นสีดำ) กฎทั้งหมดรวมกันบังคับให้ความสูงไม่เกิน 2 log2(n + 1)'),
    },
    {
      id: 'node', match: 'class node {', kind: 'class',
      use: `node *n = mRoot;   // inside the class\ncout << ${c.map ? 'n->data.first' : 'n->data'} << n->color << n->left << n->parent;`,
      title: b('class node', 'class node'),
      what: b(`Same as map_bst.h's node (data, left, right, parent) plus color. There is only the one constructor, which takes every field; insert passes RED, copy passes the source color.${c.map ? ' A default constructor would need data = src->data later, which a const key does not allow.' : ''}`, `เหมือน node ใน map_bst.h (data, left, right, parent) แต่เพิ่ม color มีตัวสร้างแบบเดียวที่รับทุกฟิลด์ insert ส่ง RED ส่วน copy ส่งสีของต้นฉบับ${c.map ? ' ถ้ามีตัวสร้างเปล่าจะต้องเขียน data = src->data ทีหลัง ซึ่ง key ที่เป็น const ไม่ยอม' : ''}`),
      notes: [
        { match: 'friend class', ...b(`Lets ${c.map ? 'map' : 'set'} (and your student.h methods) read and write the protected fields.`, `ให้ ${c.map ? 'map' : 'set'} (และเมธอดใน student.h) อ่านเขียนฟิลด์ protected ได้`) },
        { match: 'node   *parent;', ...b('NULL for the root. Rotations and relinks must keep it right, or ++ and the fix-ups walk to the wrong node.', 'เป็น NULL สำหรับราก การหมุนและการต่อลิงก์ใหม่ต้องแก้ให้ถูก ไม่อย่างนั้น ++ และ fix-up จะเดินไปผิด node') },
        { match: 'color_t color;', ...b('RED or BLACK. A NULL child has no node, so is_red(NULL) is false: empty links are black.', 'RED หรือ BLACK ลูกที่เป็น NULL ไม่มี node จึง is_red(NULL) เป็น false คือลิงก์ว่างนับเป็นสีดำ') },
        { match: 'color( color ) { }', ...b('Every field is set here; the caller still has to hook the node into its parent.', 'ตั้งค่าทุกฟิลด์ตรงนี้ แต่ผู้เรียกยังต้องต่อ node เข้ากับ parent เอง') },
      ],
    },
    {
      id: 'iterator-class', match: 'class tree_iterator {', kind: 'iterator',
      use: `${c.T}::iterator it = ${c.o}.begin();`,
      title: b('class tree_iterator', 'class tree_iterator'),
      what: b('Copied from map_bst.h: a bidirectional iterator that is one node pointer, with end() = NULL. The colors play no part in iteration; ++ and -- only use the shape and the parent pointers. ptr is protected and the tree class is not a friend.', 'เหมือนใน map_bst.h คือ iterator สองทิศทางที่เป็นพอยน์เตอร์ node ตัวเดียว end() = NULL สีไม่เกี่ยวกับการวน ++ และ -- ใช้แค่รูปร่างต้นไม้กับ parent ส่วน ptr เป็น protected และคลาสต้นไม้ไม่ใช่ friend'),
      notes: [
        { match: 'node* ptr;', ...b('Current node; NULL is end().', 'node ปัจจุบัน NULL คือ end()') },
        { match: 'tree_iterator(node *a) : ptr(a) { }', ...b('Used as iterator(ptr) by find, insert and the bounds.', 'find, insert และ lower/upper_bound ใช้เป็น iterator(ptr)') },
      ],
    },
    {
      id: 'iter-inc', match: 'tree_iterator& operator++()', kind: 'iterator',
      use: '++it;   // next larger key',
      title: b('operator++ (in-order successor)', 'operator++ (ตัวถัดไปแบบ in-order)'),
      what: b('With a right child, go there and then left as far as possible. Without one, climb while you are a right child; the first ancestor reached from its left side is next, and climbing out of the root gives NULL = end(). ++ on end() dereferences NULL.', 'ถ้ามีลูกขวา ไปทางขวาหนึ่งครั้งแล้วลงซ้ายจนสุด ถ้าไม่มี ไต่ขึ้นตราบที่ยังเป็นลูกขวา บรรพบุรุษตัวแรกที่มาถึงจากฝั่งซ้ายคือตัวถัดไป ถ้าไต่พ้นรากได้ NULL = end() การ ++ ที่ end() จะ dereference NULL'),
      time: 'O(log n) worst, O(1) amortised over a full loop',
      notes: [
        { match: 'if (ptr->right == NULL) {', ...b('No right subtree: the answer is above.', 'ไม่มีต้นไม้ย่อยขวา คำตอบอยู่ข้างบน') },
        { match: 'while (parent != NULL && parent->right == ptr) {', ...b('Climb while we came up from the right.', 'ไต่ขึ้นตราบที่ขึ้นมาจากฝั่งขวา') },
        { match: 'while (ptr->left != NULL)', ...b('Leftmost node of the right subtree.', 'node ซ้ายสุดของต้นไม้ย่อยขวา') },
      ],
    },
    {
      id: 'iter-dec', match: 'tree_iterator& operator--()', kind: 'iterator',
      use: '--it;   // next smaller key',
      title: b('operator-- (in-order predecessor)', 'operator-- (ตัวก่อนหน้าแบบ in-order)'),
      what: b('The mirror of ++. Unlike std::set, --end() does not work here: end() is NULL and there is no header node pointing at the largest key (libstdc++ keeps one for exactly this).', 'ภาพสะท้อนของ ++ ต่างจาก std::set ตรงที่ --end() ใช้ไม่ได้ เพราะ end() คือ NULL และไม่มี header node ที่ชี้ไปยัง key ใหญ่สุด (libstdc++ มี header node ไว้เพื่อเรื่องนี้)'),
      time: 'O(log n)',
      notes: [
        { match: 'while (parent != NULL && parent->left == ptr) {', ...b('Climb while we are a left child.', 'ไต่ขึ้นตราบที่เป็นลูกซ้าย') },
        { match: 'while (ptr->right != NULL)', ...b('Rightmost node of the left subtree.', 'node ขวาสุดของต้นไม้ย่อยซ้าย') },
      ],
    },
    {
      id: 'iter-post-inc', match: 'tree_iterator operator++(int)', kind: 'iterator',
      use: `for (auto it = ${c.o}.begin(); it != ${c.o}.end(); it++)\n  cout << ${c.map ? 'it->first' : '*it'};`,
      title: b('operator++(int)', 'operator++(int)'),
      what: b('Postfix: copy, advance this one, return the old copy.', 'แบบ postfix: คัดลอกไว้ เลื่อนตัวนี้ แล้วคืนสำเนาเดิม'),
      time: 'O(log n)',
    },
    {
      id: 'iter-post-dec', match: 'tree_iterator operator--(int)', kind: 'iterator',
      use: `auto it = ${c.o}.find(50);\nit--;   // the key before 50`,
      title: b('operator--(int)', 'operator--(int)'),
      what: b('Postfix --: the same pattern as postfix ++.', 'postfix -- ทำแบบเดียวกับ postfix ++'),
      time: 'O(log n)',
    },
    {
      id: 'iter-deref', match: 'ValueT& operator*()', lines: 4, kind: 'iterator',
      use: c.map ? 'it->second += 1;   // OK\n// it->first = 9;   does not compile' : 'cout << *it;\n// *it = 9;   does not compile',
      title: b('operator*, operator->, ==, !=', 'operator*, operator->, ==, !='),
      what: c.map
        ? b('* and -> give the stored pair. first is const, second is writable, so it->second = v updates a value in place without touching the tree. == and != compare node pointers.', '* และ -> ให้ pair ที่เก็บไว้ first เป็น const ส่วน second เขียนได้ it->second = v จึงแก้ค่าได้โดยไม่กระทบต้นไม้ ส่วน == และ != เทียบพอยน์เตอร์ node')
        : b('* and -> return const references, the same promise std::set makes: you can read a key but not change it. == and != compare node pointers.', '* และ -> คืนการอ้างอิงแบบ const เหมือนที่ std::set ทำ อ่าน key ได้แต่แก้ไม่ได้ ส่วน == และ != เทียบพอยน์เตอร์ node'),
    },
    {
      id: 'm-root', match: 'node     *mRoot;', lines: 1, kind: 'field',
      use: 'if (mRoot == NULL) return;   // empty tree (inside the class)',
      title: b('mRoot', 'mRoot'),
      what: b('The root node, NULL when empty. Rotations at the top change it through relink(NULL, ...), and the root is always black after every insert and erase.', 'node ราก เป็น NULL เมื่อว่าง การหมุนที่ยอดต้นไม้เปลี่ยนค่านี้ผ่าน relink(NULL, ...) และหลัง insert/erase ทุกครั้งรากเป็นสีดำเสมอ'),
    },
    {
      id: 'm-less', match: 'CompareT  mLess;', lines: 1, kind: 'field',
      use: `${c.map ? 'CP::map<int,int,std::greater<int> > big;' : 'CP::set<int,std::greater<int> > big;'}   // begin() is the largest`,
      title: b('mLess', 'mLess'),
      what: b('The comparator, std::less<KeyT> by default. Every key comparison goes through it; two keys are equal when neither is less. Pass std::greater to get a tree sorted from large to small.', 'ตัวเปรียบเทียบ ค่าเริ่มต้นคือ std::less<KeyT> การเทียบ key ทุกครั้งผ่านตัวนี้ key สองตัวเท่ากันเมื่อไม่มีตัวไหนน้อยกว่ากัน ถ้าส่ง std::greater จะได้ต้นไม้ที่เรียงจากมากไปน้อย'),
    },
    {
      id: 'm-size', match: 'size_t    mSize;', lines: 1, kind: 'field',
      use: `cout << ${c.o}.size();`,
      title: b('mSize', 'mSize'),
      what: b('Node count, kept by hand: ++ in insert, -- in erase, 0 in clear. Rotations and recolors never change it.', 'จำนวน node ที่ต้องแก้เอง ++ ใน insert, -- ใน erase, เป็น 0 ใน clear การหมุนและเปลี่ยนสีไม่เปลี่ยนค่านี้'),
    },
    {
      id: 'iterator-typedef', match: 'typedef tree_iterator iterator;', lines: 1, kind: 'type',
      use: `${c.T}::iterator it = ${c.o}.lower_bound(45);`,
      title: b('iterator', 'iterator'),
      what: b('The public name for tree_iterator, as in std::set / std::map.', 'ชื่อสาธารณะของ tree_iterator เหมือนใน std::set / std::map'),
    },
    {
      id: 'child-link', match: 'node* &child_link(node* parent, const KeyT& k)', kind: 'helper',
      use: 'child_link(parent, k) = ptr;   // attach a new leaf (inside the class)',
      title: b('child_link(parent, k)', 'child_link(parent, k)'),
      what: b('From map_bst.h: returns a reference to the pointer slot where key k belongs under parent, or mRoot when parent is NULL. insert uses it to attach the new red leaf.', 'มาจาก map_bst.h คืนการอ้างอิงไปยังช่องพอยน์เตอร์ที่ key k ควรอยู่ใต้ parent หรือ mRoot ถ้า parent เป็น NULL insert ใช้ต่อใบสีแดงใบใหม่'),
      time: 'O(1)',
      notes: [
        { match: 'if (parent == NULL) return mRoot;', ...b('Empty tree: the slot is the root pointer itself.', 'ต้นไม้ว่าง ช่องที่ได้คือพอยน์เตอร์รากเอง') },
        { match: 'parent->left : parent->right;', ...b('Returned by reference, so assigning to the result changes the tree.', 'คืนแบบอ้างอิง การกำหนดค่าให้ผลลัพธ์จึงแก้ต้นไม้จริง') },
      ],
    },
    {
      id: 'compare', match: 'int compare(const KeyT& k1, const KeyT& k2)', kind: 'helper',
      use: 'int cmp = compare(k, ptr->data' + (c.map ? '.first' : '') + ');   // -1, 0 or +1',
      title: b('compare(k1, k2)', 'compare(k1, k2)'),
      what: b('Three-way comparison built from two mLess calls: -1 if k1 < k2, +1 if k1 > k2, 0 if equal.', 'การเทียบสามทางจาก mLess สองครั้ง ได้ -1 ถ้า k1 < k2, +1 ถ้า k1 > k2 และ 0 ถ้าเท่ากัน'),
      time: 'O(1)',
    },
    {
      id: 'find-node', match: 'node* find_node(const KeyT& k,node* r, node* &parent)', kind: 'helper',
      use: 'node *parent = NULL;\nnode *ptr = find_node(k, mRoot, parent);   // inside the class',
      title: b('find_node(k, r, parent)', 'find_node(k, r, parent)'),
      what: b('Plain BST search from r. Returns the node with key k, or NULL; parent ends at the last node visited, which is exactly where insert hangs the new leaf. The colors are ignored: searching a red-black tree is ordinary BST search, just on a tree that is guaranteed short.', 'ค้นหาแบบ BST ธรรมดาจาก r คืน node ที่มี key k หรือ NULL ส่วน parent จะค้างอยู่ที่ node สุดท้ายที่เดินผ่าน ซึ่งคือที่ที่ insert จะแขวนใบใหม่ สีไม่ได้ใช้เลย การค้นในต้นไม้แดงดำคือการค้น BST ปกติ แค่ต้นไม้รับประกันว่าเตี้ย'),
      time: 'O(log n)', op: 'find',
      notes: [
        { match: 'if (cmp == 0) return ptr;', ...b('Found: parent is left untouched by this step.', 'เจอแล้ว ขั้นนี้ไม่แก้ parent') },
        { match: 'parent = ptr;', ...b('Remember where we were before stepping down.', 'จำตำแหน่งไว้ก่อนลงไปชั้นถัดไป') },
      ],
    },
    {
      id: 'find-min', match: 'node* find_min_node(node* r)', kind: 'helper',
      use: 'node *succ = find_min_node(z->right);   // successor inside erase',
      title: b('find_min_node(r)', 'find_min_node(r)'),
      what: b('Leftmost node under r (r must not be NULL). begin() calls it on mRoot, and erase calls it on z->right to find the successor that replaces a two-child node.', 'node ซ้ายสุดใต้ r (r ต้องไม่เป็น NULL) begin() เรียกด้วย mRoot และ erase เรียกด้วย z->right เพื่อหา successor มาแทน node ที่มีลูกสองตัว'),
      time: 'O(log n)', ...(c.map ? {} : { op: 'begin' }),
    },
    {
      id: 'copy', match: 'node* copy(node* src, node* parent)', kind: 'helper',
      use: 'mRoot = copy(other.mRoot, NULL);   // copy constructor',
      title: b('copy(src, parent)', 'copy(src, parent)'),
      what: b('Preorder deep copy: build the node with the same data and color, then copy the left and right subtrees under it. The copy has the same shape and colors, so it is a valid red-black tree without any fix-up.', 'คัดลอกแบบ preorder สร้าง node ที่มี data และสีเหมือนเดิม แล้วคัดลอกต้นไม้ย่อยซ้ายขวาไว้ใต้มัน ได้รูปร่างและสีเหมือนต้นฉบับ จึงเป็นต้นไม้แดงดำที่ถูกต้องโดยไม่ต้อง fix-up'),
      time: 'O(n)',
      notes: [
        { match: 'new node(src->data, NULL, NULL, parent, src->color);', ...b(`Data, parent and color are set in the constructor${c.map ? ' (data = src->data would not compile: the key is const)' : ''}.`, `ตั้ง data, parent และสีในตัวสร้างเลย${c.map ? ' (เขียน data = src->data ไม่ได้ เพราะ key เป็น const)' : ''}`) },
        { match: 'tmp->left   = copy(src->left,  tmp);', ...b('The children get tmp as their parent.', 'ลูกได้ tmp เป็น parent') },
      ],
    },
    {
      id: 'delete-all', match: 'void delete_all_nodes(node *r)', kind: 'helper',
      use: 'delete_all_nodes(mRoot);   // inside clear()',
      title: b('delete_all_nodes(r)', 'delete_all_nodes(r)'),
      what: b('Postorder delete: both subtrees first, then the node, so no pointer is read after its node is freed. No recoloring is needed; the empty tree is valid.', 'ลบแบบ postorder ลบต้นไม้ย่อยทั้งสองก่อนแล้วจึงลบ node จึงไม่มีการอ่านพอยน์เตอร์ของ node ที่ลบไปแล้ว ไม่ต้องเปลี่ยนสี เพราะต้นไม้ว่างถูกกฎเสมอ'),
      time: 'O(n)', op: 'clear',
    },
    {
      id: 'is-red', match: 'bool is_red(node *n)', kind: 'helper',
      use: 'if (is_red(u)) { /* red uncle */ }   // inside the class',
      title: b('is_red(n)', 'is_red(n)'),
      what: b('The NULL-safe color test. An empty link counts as black, which is why the fix-ups can ask about an uncle or a nephew that does not exist. Writing n->color == RED directly crashes on NULL.', 'ตัวเช็กสีที่ปลอดภัยกับ NULL ลิงก์ว่างนับเป็นสีดำ ทำให้ fix-up ถามถึงลุงหรือหลานที่ไม่มีอยู่จริงได้ ถ้าเขียน n->color == RED ตรง ๆ จะพังเมื่อ n เป็น NULL'),
      time: 'O(1)',
    },
    {
      id: 'relink', match: 'void relink(node *parent, node *child, node *next)', kind: 'helper',
      use: 'relink(z->parent, z, y);   // y takes z\'s place',
      title: b('relink(parent, child, next)', 'relink(parent, child, next)'),
      what: b('Replaces child by next in parent\'s child slot (mRoot if parent is NULL) and points next back to parent. It is the one place that updates both directions of a link, used by both rotations and by erase.', 'แทน child ด้วย next ในช่องลูกของ parent (หรือ mRoot ถ้า parent เป็น NULL) และให้ next ชี้กลับไปที่ parent เป็นที่เดียวที่แก้ลิงก์ทั้งสองทิศ ใช้ทั้งในการหมุนทั้งสองแบบและใน erase'),
      time: 'O(1)', op: 'erase',
      notes: [
        { match: 'if (parent == NULL) mRoot = next;', ...b('child was the root: the new root is next.', 'child เคยเป็นราก รากใหม่คือ next') },
        { match: 'else if (parent->left == child) parent->left = next;', ...b('Decides the side by pointer, not by key, so it also works while keys are out of order mid-erase.', 'ตัดสินฝั่งด้วยพอยน์เตอร์ ไม่ใช่ key จึงใช้ได้แม้ระหว่าง erase ที่ลำดับ key ยังไม่เรียบร้อย') },
        { match: 'if (next != NULL) next->parent = parent;', ...b('The back pointer; next may be NULL when a leaf is removed.', 'พอยน์เตอร์ย้อนกลับ next อาจเป็น NULL เมื่อลบใบ') },
      ],
    },
    {
      id: 'rotate-left', match: 'void rotate_left(node *x)', kind: 'helper',
      use: 'rotate_left(xp);   // xp->right moves up (inside a fix-up)',
      title: b('rotate_left(x)', 'rotate_left(x)'),
      what: b('x\'s right child y moves up into x\'s place and x becomes y\'s left child; y\'s old left subtree becomes x\'s right subtree. The in-order sequence stays the same and no color changes. Note the naming: here rotate_left(x) lifts the RIGHT child, while map_avl.h calls that rotate_right_child.', 'ลูกขวา y ของ x ขึ้นไปแทนที่ x และ x กลายเป็นลูกซ้ายของ y ต้นไม้ย่อยซ้ายเดิมของ y ย้ายมาเป็นลูกขวาของ x ลำดับ in-order เหมือนเดิมและไม่มีการเปลี่ยนสี ระวังชื่อ: ที่นี่ rotate_left(x) ยกลูกขวาขึ้น ส่วน map_avl.h เรียกแบบเดียวกันว่า rotate_right_child'),
      time: 'O(1)',
      notes: [
        { match: 'node *y = x->right;', ...b('y must exist; the fix-ups only rotate toward a real child.', 'y ต้องมีอยู่จริง fix-up หมุนเฉพาะไปทางที่มีลูกจริงเท่านั้น') },
        { match: 'x->right = y->left;', ...b('The middle subtree changes owner.', 'ต้นไม้ย่อยตรงกลางย้ายเจ้าของ') },
        { match: 'if (y->left != NULL) y->left->parent = x;', ...b('...and its parent pointer follows.', '...และพอยน์เตอร์ parent ของมันต้องตามไปด้วย') },
        { match: 'relink(x->parent, x, y);', ...b('Hook y where x was (maybe as mRoot).', 'ต่อ y เข้าที่เดิมของ x (อาจเป็น mRoot)') },
        { match: 'x->parent = y;', ...b('Last: x hangs under y.', 'สุดท้าย x ห้อยอยู่ใต้ y') },
      ],
    },
    {
      id: 'rotate-right', match: 'void rotate_right(node *x)', kind: 'helper',
      use: 'rotate_right(g);   // g->left moves up (insert case 3)',
      title: b('rotate_right(x)', 'rotate_right(x)'),
      what: b('The mirror image: x\'s left child y moves up, x becomes y\'s right child, and y\'s old right subtree becomes x\'s left subtree. Five pointers change; the colors do not.', 'ภาพสะท้อน: ลูกซ้าย y ของ x ขึ้นไป x กลายเป็นลูกขวาของ y และต้นไม้ย่อยขวาเดิมของ y มาเป็นลูกซ้ายของ x พอยน์เตอร์เปลี่ยน 5 ตัว สีไม่เปลี่ยน'),
      time: 'O(1)',
      notes: [
        { match: 'x->left = y->right;', ...b('The middle subtree moves from y to x.', 'ต้นไม้ย่อยตรงกลางย้ายจาก y มาที่ x') },
        { match: 'y->right = x;', ...b('x goes down to the right of y.', 'x ลงไปอยู่ทางขวาของ y') },
      ],
    },
    {
      id: 'insert-fixup', match: 'void insert_fixup(node *z)', kind: 'helper',
      use: 'insert_fixup(ptr);   // right after attaching the red leaf',
      title: b('insert_fixup(z): the insert cases', 'insert_fixup(z): กรณีของ insert'),
      what: b('A new red leaf keeps every black count equal but may sit under a red parent. While that happens: case 1, red uncle: recolor parent and uncle black and grandparent red, then repeat from the grandparent. Case 2, black uncle and z is an inner child (triangle): rotate the parent so the two reds form a line. Case 3, line: rotate the grandparent and swap colors, which ends the loop. At most 2 rotations in total; finally the root is painted black.', 'ใบแดงใหม่ไม่ทำให้จำนวน node ดำบนเส้นทางเปลี่ยน แต่อาจอยู่ใต้ parent สีแดง ระหว่างที่ยังเป็นแบบนั้น กรณี 1 ลุงแดง: เปลี่ยน parent กับลุงเป็นดำ ปู่เป็นแดง แล้วทำต่อที่ปู่ กรณี 2 ลุงดำและ z เป็นลูกด้านใน (สามเหลี่ยม): หมุนที่ parent ให้สีแดงสองตัวเรียงเป็นเส้นตรง กรณี 3 เส้นตรง: หมุนที่ปู่แล้วสลับสี จบลูป รวมแล้วหมุนไม่เกิน 2 ครั้ง สุดท้ายทาสีรากเป็นดำ'),
      time: 'O(log n), at most 2 rotations', op: 'insert',
      notes: [
        { match: 'while (z->parent != NULL && z->parent->color == RED) {', ...b('The only broken rule can be "red parent of red z".', 'กฎที่อาจพังมีแค่ "parent แดงของ z ที่แดง"') },
        { match: 'node *g = p->parent;', ...b('A red p is never the root (the root is black), so g exists.', 'p ที่เป็นสีแดงไม่มีทางเป็นราก (รากดำ) จึงมี g เสมอ') },
        { match: 'if (is_red(u)) {', ...b('Case 1: recolor only; the red may now clash one level higher, so z = g and loop.', 'กรณี 1 เปลี่ยนสีอย่างเดียว สีแดงอาจไปชนกันที่ชั้นบน จึงให้ z = g แล้ววนต่อ') },
        { match: 'if ((p->left == z) != p_is_left) {', ...b('Case 2: z and p point in different directions; one rotation at p turns it into case 3, with z and p swapping roles.', 'กรณี 2 z กับ p หันคนละทาง หมุนที่ p หนึ่งครั้งก็กลายเป็นกรณี 3 โดย z กับ p สลับบทบาทกัน') },
        { match: 'if (p_is_left) rotate_right(g);', ...b('Case 3: p moves up to g\'s place.', 'กรณี 3 p ขึ้นไปแทนที่ g') },
        { match: 'mRoot->color = BLACK;', ...b('Case 1 can paint the root red; repainting it black adds one black to every path, so the counts stay equal.', 'กรณี 1 อาจทำให้รากแดง ทาสีกลับเป็นดำจะเพิ่ม node ดำให้ทุกเส้นทางเท่ากัน จำนวนจึงยังเท่ากัน') },
      ],
    },
    {
      id: 'erase-fixup', match: 'void erase_fixup(node *x, node *xp)', kind: 'helper',
      use: 'if (removed == BLACK && mRoot != NULL) erase_fixup(x, xp);',
      title: b('erase_fixup(x, xp): the double-black cases', 'erase_fixup(x, xp): กรณี double black'),
      what: b('Removing a black node leaves the path through x one black short, so x is "double black". x may be NULL, which is why its parent xp is passed too (this tree has no sentinel nil node). With sibling w: case 1, w red: recolor and rotate at xp so x gets a black sibling. Case 2, w black with two black children: paint w red and move the extra black up to xp. Case 3, w\'s near child red and far child black: rotate at w to make the far child red. Case 4, far child red: w takes xp\'s color, xp and the far child become black, rotate at xp; done. A red x simply turns black. At most 3 rotations.', 'การลบ node ดำทำให้เส้นทางผ่าน x ขาด node ดำไปหนึ่ง x จึงเป็น "double black" x อาจเป็น NULL จึงต้องส่ง parent xp มาด้วย (ต้นไม้นี้ไม่มี node nil เฝ้ายาม) ให้ w เป็นพี่น้อง กรณี 1 w แดง: เปลี่ยนสีแล้วหมุนที่ xp ให้ x ได้พี่น้องสีดำ กรณี 2 w ดำและลูกทั้งสองดำ: ทา w เป็นแดงแล้วส่งดำส่วนเกินขึ้นไปที่ xp กรณี 3 ลูกใกล้ของ w แดงและลูกไกลดำ: หมุนที่ w ให้ลูกไกลเป็นแดง กรณี 4 ลูกไกลแดง: w รับสีของ xp, xp กับลูกไกลเป็นดำ หมุนที่ xp แล้วจบ ถ้า x เป็นแดงก็แค่ทาเป็นดำ หมุนไม่เกิน 3 ครั้ง'),
      time: 'O(log n), at most 3 rotations', op: 'erase',
      notes: [
        { match: 'while (x != mRoot && !is_red(x)) {', ...b('Stop when the extra black reaches the root (just drop it) or a red node (paint it black).', 'หยุดเมื่อดำส่วนเกินไปถึงราก (ทิ้งได้เลย) หรือเจอ node แดง (ทาเป็นดำ)') },
        { match: 'bool x_is_left = (xp->left == x) && (x != NULL || xp->right != NULL);', ...b('When x is NULL, both sides of xp might "equal" x; the sibling is the non-NULL side.', 'เมื่อ x เป็น NULL ทั้งสองฝั่งของ xp อาจดู "เท่ากับ" x ได้ ฝั่งพี่น้องคือฝั่งที่ไม่เป็น NULL') },
        { match: 'if (is_red(w)) {', ...b('Case 1, then the loop runs again with the new, black sibling.', 'กรณี 1 แล้ววนรอบใหม่กับพี่น้องตัวใหม่ที่เป็นดำ') },
        { match: 'if (!is_red(near_child) && !is_red(far_child)) {', ...b('Case 2: both sides of xp lose one black, so the problem moves up.', 'กรณี 2 ทั้งสองฝั่งของ xp เสียดำไปหนึ่ง ปัญหาจึงย้ายขึ้นข้างบน') },
        { match: 'if (!is_red(far_child)) {', ...b('Case 3 always leads to case 4 on the next round.', 'กรณี 3 จะนำไปสู่กรณี 4 ในรอบถัดไปเสมอ') },
        { match: 'w->color  = xp->color;', ...b('Case 4: the top of this subtree keeps its old color, so nothing above changes.', 'กรณี 4 ยอดของต้นไม้ย่อยนี้ได้สีเดิม ส่วนที่อยู่ข้างบนจึงไม่เปลี่ยน') },
        { match: 'if (x != NULL) x->color = BLACK;', ...b('A red x absorbs the extra black.', 'x สีแดงรับดำส่วนเกินไว้') },
      ],
    },
    {
      id: 'copy-ctor', match: c.copyCtor, kind: 'ctor',
      use: `${c.T} b(${c.o});   // independent copy`,
      title: b('copy constructor', 'copy constructor'),
      what: b('Deep copy with copy(other.mRoot, NULL): same shape, same colors, own nodes. O(n), no insert calls and no rotations.', 'คัดลอกลึกด้วย copy(other.mRoot, NULL) ได้รูปร่างและสีเหมือนกันแต่เป็น node ของตัวเอง O(n) ไม่เรียก insert และไม่หมุน'),
      time: 'O(n)',
    },
    {
      id: 'ctor', match: '(const CompareT& c = CompareT() )', kind: 'ctor',
      use: `${c.T} ${c.o};   // empty`,
      title: b('default constructor', 'default constructor'),
      what: b('An empty tree: mRoot NULL, mSize 0. The empty tree satisfies every red-black rule.', 'ต้นไม้ว่าง mRoot เป็น NULL และ mSize เป็น 0 ต้นไม้ว่างผ่านกฎแดงดำทุกข้อ'),
      time: 'O(1)',
    },
    {
      id: 'assign', match: '& operator=(', kind: 'operator',
      use: `${c.o}2 = ${c.o};   // copy-and-swap`,
      title: b('operator= (copy-and-swap)', 'operator= (copy-and-swap)'),
      what: b('As in map_bst.h: other is taken by value (a full copy), the fields are swapped, and other\'s destructor frees the old nodes.', 'เหมือนใน map_bst.h รับ other แบบ by value (คัดลอกทั้งต้น) สลับฟิลด์กัน แล้วให้ destructor ของ other ลบ node เก่า'),
      time: 'O(n)',
    },
    {
      id: 'dtor', match: c.dtor, kind: 'ctor',
      use: `{ ${c.T} tmp; }   // destroyed here`,
      title: b('destructor', 'destructor'),
      what: b('Calls clear(), which frees every node.', 'เรียก clear() ซึ่งลบ node ทั้งหมด'),
      time: 'O(n)', op: 'clear',
    },
    {
      id: 'empty', match: 'bool empty()', kind: 'method',
      use: `if (${c.o}.empty()) cout << "empty";`,
      title: b('empty()', 'empty()'),
      what: b('mSize == 0.', 'mSize == 0'),
      time: 'O(1)',
    },
    {
      id: 'size', match: 'size_t size()', kind: 'method',
      use: `cout << ${c.o}.size();`,
      title: b('size()', 'size()'),
      what: b('Returns mSize; nothing is counted.', 'คืน mSize โดยไม่ต้องนับ'),
      time: 'O(1)',
    },
    {
      id: 'begin', match: 'iterator begin()', kind: 'method',
      use: `cout << ${c.map ? 'm.begin()->first' : '*s.begin()'};   // smallest key`,
      title: b('begin()', 'begin()'),
      what: b('The leftmost node, or end() for an empty tree. std::set caches it in the header node for O(1); here it walks down, O(log n).', 'node ซ้ายสุด หรือ end() ถ้าต้นไม้ว่าง std::set เก็บค่านี้ไว้ใน header node จึงเป็น O(1) แต่ที่นี่เดินลงไปจึงเป็น O(log n)'),
      time: 'O(log n)', ...(c.map ? {} : { op: 'begin' }),
      notes: [{ match: 'find_min_node(mRoot)', ...b('Guarded: find_min_node needs a non-NULL node.', 'มีการเช็กก่อน เพราะ find_min_node ต้องการ node ที่ไม่ใช่ NULL') }],
    },
    {
      id: 'end', match: 'iterator end()', kind: 'method',
      use: `if (${c.o}.find(7) == ${c.o}.end()) cout << "no 7";`,
      title: b('end()', 'end()'),
      what: b('iterator(NULL): what find and the bounds return for "not there", and what ++ reaches after the largest key.', 'iterator(NULL) คือค่าที่ find และ lower/upper_bound คืนเมื่อ "ไม่มี" และคือที่ที่ ++ ไปถึงหลัง key ที่ใหญ่สุด'),
      time: 'O(1)',
    },
    {
      id: 'clear', match: 'void clear()', kind: 'method',
      use: `${c.o}.clear();`,
      title: b('clear()', 'clear()'),
      what: b('Frees every node and resets mRoot and mSize.', 'ลบ node ทั้งหมด แล้วรีเซ็ต mRoot และ mSize'),
      time: 'O(n)', op: 'clear',
      notes: [{ match: 'mRoot = NULL;', ...b('Never leave mRoot pointing at freed memory.', 'อย่าปล่อยให้ mRoot ชี้หน่วยความจำที่ลบไปแล้ว') }],
    },
    {
      id: 'insert', match: 'std::pair<iterator,bool> insert(const ValueT& val)', kind: 'method',
      use: c.map ? 'auto r = m.insert({5, 50});\nif (!r.second) cout << "5 was already there: " << r.first->second;' : 'if (s.insert(5).second) cout << "new";',
      title: b('insert(val)', 'insert(val)'),
      what: b(`BST insert exactly as in map_bst.h, except the new leaf is red and insert_fixup repairs the colors afterwards. A key that is already present is left alone${c.map ? ', together with its value: insert never overwrites' : ''}. Returns (iterator to the ${elem}, true if it was new). The returned iterator stays right after the fix-up because rotations move nodes, not data.`, `insert แบบ BST เหมือนใน map_bst.h แต่ใบใหม่เป็นสีแดงและเรียก insert_fixup ซ่อมสีหลังจากนั้น ถ้ามี key อยู่แล้วจะไม่ทำอะไร${c.map ? ' รวมถึงไม่แตะค่าของมัน insert ไม่เขียนทับเลย' : ''} คืน (iterator ไปยัง ${elemTh}, true ถ้าเป็นของใหม่) iterator ที่คืนยังถูกต้องหลัง fix-up เพราะการหมุนย้าย node ไม่ได้ย้ายข้อมูล`),
      time: 'O(log n)', op: 'insert',
      notes: [
        { match: 'if (ptr != NULL) return std::make_pair(iterator(ptr), false);', ...b('Duplicate: nothing changes.', 'key ซ้ำ ไม่มีอะไรเปลี่ยน') },
        { match: 'NULL,NULL,parent,RED);', ...b('Red, so no path gains a black node; only the "red parent" rule can break.', 'เป็นสีแดง จึงไม่มีเส้นทางไหนได้ node ดำเพิ่ม กฎที่อาจพังมีแค่ "parent แดง"') },
        { match: 'child_link(parent, val', ...b('Hang it where the search fell off the tree.', 'แขวนไว้ตรงที่การค้นหาตกจากต้นไม้') },
        { match: 'insert_fixup(ptr);', ...b('Recolor and rotate; ptr itself may move up but keeps its data.', 'เปลี่ยนสีและหมุน ptr อาจถูกยกขึ้นแต่ข้อมูลยังเป็นของมัน') },
      ],
    },
    {
      id: 'erase', match: 'size_t erase(const KeyT &key)', kind: 'method',
      use: `${c.o}.erase(5);   // returns 1 or 0`,
      title: b('erase(key)', 'erase(key)'),
      what: b('With zero or one child, z\'s child (maybe NULL) takes its place. With two children, the successor y (leftmost in z\'s right subtree) is unlinked from its spot and relinked into z\'s place, taking z\'s color; no data is copied, so iterators to every other element stay valid. If the node that really left a spot was black, erase_fixup repairs the missing black at x, whose parent is xp.', 'ถ้ามีลูก 0 หรือ 1 ตัว ลูกของ z (อาจเป็น NULL) ขึ้นมาแทน ถ้ามีลูกสองตัว successor y (ซ้ายสุดของต้นไม้ย่อยขวาของ z) จะถูกตัดออกจากที่เดิมแล้วต่อเข้าที่ของ z พร้อมรับสีของ z ไม่มีการคัดลอกข้อมูล iterator ที่ชี้สมาชิกอื่นจึงยังใช้ได้ทั้งหมด ถ้า node ที่ออกจากตำแหน่งจริงเป็นสีดำ erase_fixup จะซ่อมดำที่ขาดไปที่ x ซึ่งมี parent เป็น xp'),
      time: 'O(log n)', op: 'erase',
      notes: [
        { match: 'color_t removed = z->color;', ...b('The color of the node that leaves a spot; for two children it becomes y\'s color.', 'สีของ node ที่ออกจากตำแหน่ง ถ้ามีลูกสองตัวจะเปลี่ยนเป็นสีของ y') },
        { match: 'x  = (z->left != NULL) ? z->left : z->right;', ...b('The child that moves up, NULL for a leaf.', 'ลูกที่ขยับขึ้นมา เป็น NULL ถ้า z เป็นใบ') },
        { match: 'if (y->parent == z) {', ...b('y is z\'s right child: it keeps its right subtree and x stays under y.', 'y เป็นลูกขวาของ z: y เก็บต้นไม้ย่อยขวาของตัวเองไว้ และ x ยังอยู่ใต้ y') },
        { match: 'relink(xp, y, x);', ...b('Otherwise y\'s right child takes y\'s old spot, and y adopts z\'s right subtree.', 'ไม่อย่างนั้น ลูกขวาของ y ขึ้นมาแทนที่เดิมของ y และ y รับต้นไม้ย่อยขวาของ z') },
        { match: 'y->color = z->color;', ...b('z\'s position keeps its color, so the only change in black counts is at y\'s old spot.', 'ตำแหน่งของ z ยังมีสีเดิม จำนวนดำจึงเปลี่ยนเฉพาะที่ตำแหน่งเดิมของ y') },
        { match: 'if (removed == BLACK && mRoot != NULL) erase_fixup(x, xp);', ...b('A red node leaving changes no black count: nothing to fix.', 'ถ้า node ที่ออกไปเป็นแดง จำนวนดำไม่เปลี่ยน ไม่ต้องซ่อม') },
      ],
    },
    {
      id: 'find', match: 'iterator find(const KeyT &key)', kind: 'method',
      use: `auto it = ${c.o}.find(5);\nif (it != ${c.o}.end()) cout << ${c.map ? 'it->second' : '*it'};`,
      title: b('find(key)', 'find(key)'),
      what: b('find_node from the root, wrapped in an iterator; end() when missing.', 'เรียก find_node จากราก แล้วห่อเป็น iterator ถ้าไม่เจอได้ end()'),
      time: 'O(log n)', op: 'find',
    },
    {
      id: 'count', match: 'size_t count(const KeyT &key)', kind: 'method',
      use: `if (${c.o}.count(5)) cout << "has 5";`,
      title: b('count(key)', 'count(key)'),
      what: b('0 or 1, because keys are unique. It is the idiomatic "contains" check.', 'ได้ 0 หรือ 1 เพราะ key ไม่ซ้ำ เป็นวิธีมาตรฐานในการเช็กว่า "มีไหม"'),
      time: 'O(log n)', op: 'count',
    },
    {
      id: 'lower-bound', match: 'iterator lower_bound(const KeyT &key)', kind: 'method',
      use: `auto it = ${c.o}.lower_bound(45);   // first ${c.map ? 'key' : 'element'} >= 45`,
      title: b('lower_bound(key)', 'lower_bound(key)'),
      what: b(`One walk down: a node with key >= key is a candidate (remember it in ans and go left for a smaller one), otherwise go right. When the walk falls off the tree, ans is the first ${elem} >= key, or NULL = end(). Use --it on the result to get the last ${elem} < key (check it != begin() first).`, `เดินลงเส้นเดียว node ที่ key >= key เป็นผู้สมัคร (จำไว้ใน ans แล้วไปซ้ายหาตัวที่เล็กกว่า) ไม่อย่างนั้นไปขวา เมื่อตกจากต้นไม้ ans คือ ${elemTh} ตัวแรกที่ >= key หรือ NULL = end() ใช้ --it กับผลลัพธ์เพื่อได้ตัวสุดท้ายที่ < key (เช็ก it != begin() ก่อน)`),
      time: 'O(log n)', op: 'lower_bound',
      notes: [
        { match: 'if (!mLess(ptr->data', ...b('key <= node: a candidate.', 'key <= node เป็นผู้สมัคร') },
        { match: 'ans = ptr;', ...b('The best so far; anything better is to the left.', 'ดีที่สุดจนถึงตอนนี้ ตัวที่ดีกว่าอยู่ทางซ้าย') },
      ],
    },
    {
      id: 'upper-bound', match: 'iterator upper_bound(const KeyT &key)', kind: 'method',
      use: `auto it = ${c.o}.upper_bound(50);   // first ${c.map ? 'key' : 'element'} > 50`,
      title: b('upper_bound(key)', 'upper_bound(key)'),
      what: b(`The same walk with a strict test: the first ${elem} > key. The keys in [a, b] are exactly lower_bound(a) up to (not including) upper_bound(b).`, `เดินแบบเดียวกันแต่ใช้เงื่อนไขแบบเคร่ง ได้ ${elemTh} ตัวแรกที่ > key ดังนั้น key ในช่วง [a, b] คือตั้งแต่ lower_bound(a) ถึงก่อน upper_bound(b) พอดี`),
      time: 'O(log n)', op: 'upper_bound',
      notes: [{ match: 'if (mLess(key, ptr->data', ...b('Strictly greater: a candidate.', 'มากกว่าแบบเคร่ง เป็นผู้สมัคร') }],
    },
    {
      id: 'print-node', match: 'void print_node(node *n,size_t depth)', kind: 'helper',
      use: 'print_node(mRoot, 0);   // inside print()',
      title: b('print_node(n, depth)', 'print_node(n, depth)'),
      what: b('Reverse in-order (right, node, left) with "--" per level, so the tree reads sideways with the root on the left. Each line ends with (R) or (B).', 'in-order แบบกลับด้าน (ขวา, node, ซ้าย) และพิมพ์ "--" ตามระดับ ต้นไม้จึงอ่านแบบตะแคงโดยรากอยู่ซ้าย แต่ละบรรทัดลงท้ายด้วย (R) หรือ (B)'),
      time: 'O(n)',
      notes: [{ match: '(n->color == RED ? " (R)" : " (B)")', ...b('The color tag.', 'ป้ายบอกสี') }],
    },
    {
      id: 'print', match: 'void print()', kind: 'method',
      use: `${c.o}.print();   // debugging only`,
      title: b('print()', 'print()'),
      what: b('Prints the size and the sideways tree. For debugging; never call it in a submitted student.h.', 'พิมพ์ขนาดและต้นไม้แบบตะแคง ใช้ดีบั๊กเท่านั้น ห้ามเรียกใน student.h ที่ส่ง'),
      time: 'O(n)',
    },
    {
      id: 'black-height', match: 'int black_height(node *r)', kind: 'helper',
      use: 'int bh = black_height(mRoot);   // -1 means broken',
      title: b('black_height(r)', 'black_height(r)'),
      what: b('Postorder check of two rules at once: returns the number of black nodes on every path from r down to a NULL link (counting the NULL), or -1 if a red node has a red child or two paths disagree.', 'ตรวจกฎสองข้อพร้อมกันแบบ postorder คืนจำนวน node ดำบนทุกเส้นทางจาก r ลงไปถึงลิงก์ NULL (นับ NULL ด้วย) หรือ -1 ถ้ามี node แดงที่มีลูกแดง หรือสองเส้นทางนับได้ไม่เท่ากัน'),
      time: 'O(n)',
      notes: [
        { match: 'if (r == NULL) return 1;', ...b('A NULL link counts as one black.', 'ลิงก์ NULL นับเป็นดำหนึ่ง') },
        { match: 'if (is_red(r) && (is_red(r->left) || is_red(r->right))) return -1;', ...b('Red-red violation.', 'ผิดกฎแดงติดแดง') },
        { match: 'if (hL == -1 || hR == -1 || hL != hR) return -1;', ...b('A broken subtree, or unequal black counts.', 'ต้นไม้ย่อยผิดกฎ หรือจำนวนดำไม่เท่ากัน') },
        { match: 'return hL + (r->color == BLACK ? 1 : 0);', ...b('Add r itself if it is black.', 'บวก r เองถ้า r เป็นสีดำ') },
      ],
    },
    {
      id: 'check-red-black', match: 'bool checkRedBlack()', kind: 'method',
      use: `assert(${c.o}.checkRedBlack());   // after every operation while testing`,
      title: b('checkRedBlack()', 'checkRedBlack()'),
      what: b('True when the root is black and black_height succeeds. It checks colors only, not the BST order or the parent pointers.', 'เป็นจริงเมื่อรากดำและ black_height ไม่ได้ -1 ตรวจเฉพาะสี ไม่ได้ตรวจลำดับ BST หรือพอยน์เตอร์ parent'),
      time: 'O(n)',
    },
    {
      id: 'extra-decl', match: '// practice: declare your own method here', lines: 1, kind: 'helper',
      use: 'size_t count_red(node *r);   // your own practice method',
      title: b('your method', 'เมธอดของคุณ'),
      what: b('The grader problems use std::set / std::map directly, so none of them adds a method here. To practise, declare one (for example counting red nodes) and write its body in student.h, using mRoot, the node fields and is_red.', 'โจทย์ grader ใช้ std::set / std::map ตรง ๆ จึงไม่มีข้อไหนเพิ่มเมธอดตรงนี้ ถ้าจะฝึก ให้ประกาศเมธอดเอง (เช่นนับ node แดง) แล้วเขียนตัวเมธอดใน student.h โดยใช้ mRoot, ฟิลด์ของ node และ is_red'),
    },
  ];
}

export const rbInvariants = [
  b('BST order by mLess: everything in x->left is less than x and everything in x->right is greater; keys are unique.', 'ลำดับ BST ตาม mLess: ทุกอย่างใน x->left น้อยกว่า x และทุกอย่างใน x->right มากกว่า key ไม่ซ้ำ'),
  b('The root is black (mRoot == NULL or mRoot->color == BLACK).', 'รากเป็นสีดำ (mRoot == NULL หรือ mRoot->color == BLACK)'),
  b('No red node has a red child (NULL counts as black).', 'node แดงไม่มีลูกแดง (NULL นับเป็นดำ)'),
  b('Every path from a node down to a NULL link passes the same number of black nodes; hence height <= 2 log2(n + 1).', 'ทุกเส้นทางจาก node หนึ่งลงไปถึงลิงก์ NULL ผ่าน node ดำจำนวนเท่ากัน ผลคือความสูงไม่เกิน 2 log2(n + 1)'),
  b('Parent pointers agree with child pointers, mRoot->parent == NULL, and mSize is the number of nodes.', 'พอยน์เตอร์ parent สอดคล้องกับพอยน์เตอร์ลูก mRoot->parent == NULL และ mSize เท่ากับจำนวน node'),
];

export const rbPitfalls = (c) => [
  b(`Erasing while iterating: ${c.o}.erase(*it) / ${c.o}.erase(it->first) frees the node it points at, so ++it afterwards reads freed memory. Save the next iterator (or key) first. std::${c.map ? 'map' : 'set'}::erase(it) returns the next iterator for this reason.`, `ลบระหว่างวนลูป: ${c.o}.erase(*it) / ${c.o}.erase(it->first) ลบ node ที่ it ชี้อยู่ ถ้า ++it ต่อจะอ่านหน่วยความจำที่ลบแล้ว ให้เก็บ iterator ตัวถัดไป (หรือ key) ไว้ก่อน std::${c.map ? 'map' : 'set'}::erase(it) จึงคืน iterator ตัวถัดไปให้`),
  b('Checking n->color == RED on a possibly NULL node. Always use is_red(n), which treats NULL as black.', 'เช็ก n->color == RED กับ node ที่อาจเป็น NULL ให้ใช้ is_red(n) เสมอ เพราะนับ NULL เป็นดำ'),
  b('A rotation that fixes left/right but forgets one parent pointer (the moved middle subtree, or the new top\'s parent). The tree still prints fine, but ++ and the next fix-up go wrong.', 'หมุนแล้วแก้ left/right แต่ลืมพอยน์เตอร์ parent ตัวใดตัวหนึ่ง (ต้นไม้ย่อยตรงกลางที่ย้าย หรือ parent ของยอดใหม่) ต้นไม้ยังพิมพ์ออกมาดูปกติ แต่ ++ และ fix-up ครั้งต่อไปจะผิด'),
  b(`Using ${c.map ? 'it->first' : '*it'} to change a key: it is const for a reason. Erase and insert again instead.`, `ใช้ ${c.map ? 'it->first' : '*it'} เพื่อแก้ key ซึ่งเป็น const โดยตั้งใจ ให้ erase แล้ว insert ใหม่แทน`),
  b(`Calling --${c.o}.end(): end() is NULL here (std::${c.map ? 'map' : 'set'} allows it). To get the largest key, walk right from mRoot.`, `เรียก --${c.o}.end(): ที่นี่ end() คือ NULL (std::${c.map ? 'map' : 'set'} ทำได้) ถ้าต้องการ key ใหญ่สุดให้เดินขวาจาก mRoot`),
  b('Counting elements in a range with std::distance(lower_bound(a), upper_bound(b)): it walks every element, O(k). For many range queries use a sorted vector and subtract indices instead.', 'นับสมาชิกในช่วงด้วย std::distance(lower_bound(a), upper_bound(b)) จะเดินผ่านทุกตัว เป็น O(k) ถ้ามีคำถามช่วงจำนวนมากให้ใช้ vector ที่เรียงแล้วลบตำแหน่งกันแทน'),
];

export default {
  id: 'set',
  file: 'set.h',
  title: 'set.h',
  className: 'CP::set<KeyT, CompareT> (red-black)',
  module: 'data/set',
  source: b(
    'Written for this site: the course has no set header, so this one shows the red-black tree that std::set is usually built on (not the professor\'s code). It reuses map_bst.h\'s style (node with parent pointers, child_link, find_node, the same iterator) and runs exactly the insert and erase cases of the set Learning module. It compiles with g++ -std=c++11 and was tested against std::set.',
    'เขียนขึ้นสำหรับเว็บนี้: วิชานี้ไม่มี header ของ set จึงเขียนต้นไม้แดงดำแบบที่ std::set มักใช้ขึ้นมาให้ดู (ไม่ใช่โค้ดของอาจารย์) ใช้รูปแบบเดียวกับ map_bst.h (node มี parent, child_link, find_node, iterator แบบเดียวกัน) และทำกรณีของ insert และ erase ตรงกับโมดูล set ในหน้า Learning ทุกขั้น คอมไพล์ได้ด้วย g++ -std=c++11 และทดสอบเทียบกับ std::set แล้ว',
  ),
  overview: b(
    'A set is a binary search tree of unique keys that stays balanced with one color bit per node. Insert attaches a red leaf and then fixes "red under red" by recoloring or by at most two rotations. Erase removes a node (relinking the successor node when there are two children) and, if a black node left, fixes the missing black with at most three rotations. The rules keep the height below 2 log2(n + 1), so insert, erase, find, count, lower_bound and upper_bound are all O(log n). Iteration is the same parent-pointer walk as map_bst.h and visits keys in sorted order.',
    'set คือต้นไม้ค้นหาแบบทวิภาคของ key ที่ไม่ซ้ำกัน และรักษาสมดุลด้วยสี 1 บิตต่อ node การ insert ต่อใบสีแดงแล้วแก้ปัญหา "แดงอยู่ใต้แดง" ด้วยการเปลี่ยนสี หรือหมุนไม่เกินสองครั้ง การ erase ลบ node (ถ้ามีลูกสองตัวจะย้าย node successor มาแทน) และถ้า node ที่ออกไปเป็นสีดำ จะซ่อมดำที่ขาดด้วยการหมุนไม่เกินสามครั้ง กฎสีทำให้ความสูงต่ำกว่า 2 log2(n + 1) ดังนั้น insert, erase, find, count, lower_bound และ upper_bound เป็น O(log n) ทั้งหมด การวนใช้ parent เดินแบบเดียวกับ map_bst.h และได้ key เรียงจากน้อยไปมาก',
  ),
  fields: [
    { name: 'mRoot', type: 'node *', ...b('The root, NULL when empty; always black otherwise. Rotations at the top replace it.', 'ราก เป็น NULL เมื่อว่าง นอกนั้นเป็นสีดำเสมอ การหมุนที่ยอดต้นไม้จะเปลี่ยนค่านี้') },
    { name: 'mLess', type: 'CompareT', ...b('The key comparator (std::less<KeyT> by default).', 'ตัวเปรียบเทียบ key (ค่าเริ่มต้น std::less<KeyT>)') },
    { name: 'mSize', type: 'size_t', ...b('Number of nodes, updated by insert, erase and clear.', 'จำนวน node แก้โดย insert, erase และ clear') },
    { name: 'node::data', type: 'ValueT (= KeyT)', ...b('The key. The iterator exposes it as const.', 'key ซึ่ง iterator ให้ออกมาเป็น const') },
    { name: 'node::left / right / parent', type: 'node *', ...b('Tree links, NULL for none; parent is NULL only at the root.', 'ลิงก์ในต้นไม้ NULL คือไม่มี parent เป็น NULL ที่รากเท่านั้น') },
    { name: 'node::color', type: 'color_t', ...b('RED or BLACK. New nodes are red; the fix-ups recolor.', 'RED หรือ BLACK node ใหม่เป็นแดง fix-up จะเปลี่ยนสี') },
  ],
  invariants: rbInvariants,
  checklist: [
    b('The grader problems use std::set itself. Know the interface: insert(x).second tells you whether x was new, count(x) is 0 or 1, erase(x) returns how many were removed.', 'โจทย์ grader ใช้ std::set ตรง ๆ จึงต้องรู้ interface: insert(x).second บอกว่า x เป็นของใหม่ไหม, count(x) ได้ 0 หรือ 1, erase(x) คืนจำนวนที่ลบ'),
    b('Every operation is O(log n), so n operations cost O(n log n). That is the budget most 10^5 to 10^6 input problems expect.', 'ทุกฟังก์ชันเป็น O(log n) ทำ n ครั้งจึงเป็น O(n log n) ซึ่งเป็นงบที่โจทย์ข้อมูล 10^5 ถึง 10^6 ส่วนใหญ่คาดไว้'),
    b('Iterating a set gives keys in sorted order. Use it to deduplicate and sort in one step.', 'วนใน set จะได้ key เรียงลำดับ ใช้กำจัดตัวซ้ำและเรียงในขั้นเดียว'),
    b('For "largest element <= x" use upper_bound(x) and step back with --it, after checking it != begin().', 'ถ้าต้องการ "ตัวใหญ่สุดที่ <= x" ใช้ upper_bound(x) แล้วถอยด้วย --it หลังเช็กว่า it != begin()'),
    b('A set of pairs (or of a struct with operator<) sorts lexicographically: set<pair<int,int>> orders by first, then second.', 'set ของ pair (หรือ struct ที่มี operator<) เรียงแบบพจนานุกรม set<pair<int,int>> เรียงตาม first ก่อนแล้วตาม second'),
    b('If you only need membership and never order, unordered_set is faster on average; a set gives you order and bounds.', 'ถ้าต้องการแค่เช็กว่ามีไหมและไม่สนลำดับ unordered_set เร็วกว่าโดยเฉลี่ย ส่วน set ให้ทั้งลำดับและ lower/upper_bound'),
  ],
  pitfalls: rbPitfalls({ o: 's', map: false }),
  student: {
    ...b(
      'No grader problem extends CP::set; they use std::set inside the method or function you write. The usual pattern is a "seen" set: insert(x).second is true the first time x appears. Here is d60_q1_v_uniq, which keeps the first copy of each value in a CP::vector.',
      'ไม่มีโจทย์ grader ข้อไหนเพิ่มเมธอดให้ CP::set แต่จะใช้ std::set ในเมธอดหรือฟังก์ชันที่เราเขียน รูปแบบที่พบบ่อยคือ set "เคยเห็น" โดย insert(x).second เป็นจริงครั้งแรกที่เจอ x ตัวอย่างคือ d60_q1_v_uniq ที่เก็บเฉพาะตัวแรกของแต่ละค่าใน CP::vector',
    ),
    code: `#include <set>

template <typename T>
void CP::vector<T>::uniq() {
  std::set<T> seen;
  size_t j = 0;
  for (size_t i = 0; i < mSize; i++)
    if (seen.insert(mData[i]).second)   // true only the first time
      mData[j++] = mData[i];
  mSize = j;
}`,
  },
  problems: [
    { name: 'd60_q1_v_uniq', ...b('Add uniq() to CP::vector: keep only the first occurrence of each value, in the original order. Walk mData once with a std::set<T> of values already seen; copy forward each value whose insert(...).second is true and set mSize to the new count. O(n log n).', 'เพิ่ม uniq() ให้ CP::vector เก็บเฉพาะตัวแรกของแต่ละค่าโดยลำดับเดิม เดินใน mData รอบเดียวพร้อม std::set<T> ของค่าที่เคยเห็น คัดลอกไปข้างหน้าเฉพาะค่าที่ insert(...).second เป็นจริง แล้วตั้ง mSize เป็นจำนวนใหม่ O(n log n)') },
    { name: 'd61_q1_ordered_set', ...b('Union(A, B): A in order, then the values of B not already present. Intersect(A, B): the values of A that are also in B, in A\'s order. Build a std::set from one side and test with insert(x).second or count(x): O((|A| + |B|) log n) for up to 100000 values.', 'Union(A, B): A ตามลำดับเดิมแล้วต่อด้วยค่าใน B ที่ยังไม่มี Intersect(A, B): ค่าใน A ที่อยู่ใน B ด้วยตามลำดับของ A สร้าง std::set จากฝั่งหนึ่งแล้วเช็กด้วย insert(x).second หรือ count(x) ได้ O((|A| + |B|) log n) สำหรับข้อมูลไม่เกิน 100000 ตัว') },
    { name: 'ex00e3', ...b('Is the sequence d1..dN a permutation of 1..N? Every value must be in [1, N] and no value may repeat: insert into a std::set and answer YES when no insert fails, no value is out of range, and the size ends at N.', 'ลำดับ d1..dN เป็นการเรียงสับเปลี่ยนของ 1..N หรือไม่ ทุกค่าต้องอยู่ใน [1, N] และห้ามซ้ำ ใส่ลง std::set แล้วตอบ YES เมื่อไม่มี insert ไหนล้มเหลว ไม่มีค่าไหนนอกช่วง และขนาดสุดท้ายเท่ากับ N') },
    { name: 'd63_q1a_hiatus', ...b('For each (year, month) query print 0 0 if a chapter came out that month, otherwise the latest month before it with a chapter, or -1 -1 if none. Store the months in a std::set<pair<int,int>>; it = lower_bound(q): an exact hit gives 0 0, it == begin() gives -1 -1, else print *prev(it). O((n + m) log n).', 'แต่ละคำถาม (ปี, เดือน) ให้พิมพ์ 0 0 ถ้าเดือนนั้นมีการตีพิมพ์ ไม่อย่างนั้นพิมพ์เดือนล่าสุดก่อนหน้าที่มีการตีพิมพ์ หรือ -1 -1 ถ้าไม่มี เก็บเดือนใน std::set<pair<int,int>> แล้ว it = lower_bound(q) ถ้าเจอตรงพอดีได้ 0 0 ถ้า it == begin() ได้ -1 -1 ไม่อย่างนั้นพิมพ์ *prev(it) ได้ O((n + m) log n)') },
    { name: 'da66_m2_change_data', ...b('change_3 gets a std::set<pair<list<int>, map<int, pair<int,string>>>> and must turn every int equal to from into to. Set elements are const, so build a new set: copy each element, edit the list and rebuild the inner map (its keys are const too), insert the edited copy, then swap the new set into a.', 'change_3 รับ std::set<pair<list<int>, map<int, pair<int,string>>>> และต้องเปลี่ยน int ทุกตัวที่เท่ากับ from เป็น to สมาชิกของ set เป็น const จึงต้องสร้าง set ใหม่ คัดลอกแต่ละสมาชิก แก้ list แล้วสร้าง map ข้างในใหม่ (key ของ map ก็เป็น const) insert ตัวที่แก้แล้ว จากนั้น swap set ใหม่เข้าไปแทน a') },
  ],
  regions: rbRegions({ map: false, o: 's', T: 'CP::set<int>', copyCtor: 'set(const set<KeyT,CompareT> & other)', dtor: '~set()' }),
};
