// Annotations for map.h: the same red-black tree as set.h (regions shared through rbRegions), plus operator[] and at.
import { rbInvariants, rbPitfalls, rbRegions } from './set.js';

const b = (en, th) => ({ en, th });

const extra = {
  subscript: {
    id: 'subscript', match: 'MappedT& operator[](const KeyT& key)', kind: 'operator',
    use: 'm[5] = 50;      // inserts 5 if missing, then assigns\ncnt[name]++;    // counting: a new key starts at 0',
    title: b('operator[]', 'operator[]'),
    what: b('Calls insert with (key, MappedT()) and returns a reference to the value of whatever node holds key. If the key was missing, the new node with the default value (0 for numbers, "" for strings) goes through the full red-black insert; if it was present, insert changes nothing and the existing value is returned. Either way the assignment m[k] = v happens afterwards, through the reference. Even reading m[k] inserts a missing key.', 'เรียก insert ด้วย (key, MappedT()) แล้วคืนการอ้างอิงไปยังค่าของ node ที่มี key นั้น ถ้า key ยังไม่มี node ใหม่ที่มีค่าเริ่มต้น (0 สำหรับตัวเลข "" สำหรับ string) จะผ่าน insert แบบแดงดำเต็มขั้น ถ้ามีอยู่แล้ว insert ไม่เปลี่ยนอะไรและคืนค่าเดิม ทั้งสองกรณีการกำหนด m[k] = v เกิดขึ้นทีหลังผ่านการอ้างอิงนั้น แม้แค่อ่าน m[k] ก็ insert key ที่ไม่มีเข้าไปแล้ว'),
    time: 'O(log n)', op: 'operator[]',
    notes: [
      { match: 'insert(std::make_pair(key,MappedT()));', ...b('Builds a default MappedT every call, even when the key exists; insert ignores it then.', 'สร้าง MappedT ค่าเริ่มต้นทุกครั้ง แม้ key จะมีอยู่แล้ว ซึ่ง insert จะไม่สนใจ') },
      { match: 'return r.first->second;', ...b('A reference into the node: it stays valid until that key is erased, because rotations move nodes, not values.', 'เป็นการอ้างอิงเข้าไปใน node ใช้ได้จนกว่า key นั้นจะถูกลบ เพราะการหมุนย้าย node ไม่ได้ย้ายค่า') },
    ],
  },
  at: {
    id: 'at', match: 'MappedT& at(const KeyT &key)', kind: 'method',
    use: 'try { cout << m.at(7); }\ncatch (std::out_of_range &e) { cout << "no 7"; }',
    title: b('at(key)', 'at(key)'),
    what: b('Read or write the value of an existing key without ever inserting. A missing key throws std::out_of_range and the map stays unchanged. Use it (or find / count) when a lookup must not create entries.', 'อ่านหรือเขียนค่าของ key ที่มีอยู่โดยไม่ insert เลย ถ้าไม่มี key จะ throw std::out_of_range และ map ไม่เปลี่ยน ใช้ at (หรือ find / count) เมื่อการค้นหาต้องไม่สร้างข้อมูลใหม่'),
    time: 'O(log n)', op: 'at',
    notes: [{ match: 'throw std::out_of_range("map::at");', ...b('Same exception type as std::map::at; it needs <stdexcept>.', 'exception ชนิดเดียวกับ std::map::at ต้อง include <stdexcept>') }],
  },
};

function mapRegions() {
  const regions = rbRegions({ map: true, o: 'm', T: 'CP::map<int,int>', copyCtor: 'map(const map<KeyT,MappedT,CompareT> & other)', dtor: '~map()' });
  const after = (id, item) => regions.splice(regions.findIndex((r) => r.id === id) + 1, 0, item);
  after('clear', extra.subscript);
  after('erase', extra.at);
  return regions;
}

export default {
  id: 'map',
  file: 'map.h',
  title: 'map.h',
  className: 'CP::map<KeyT, MappedT, CompareT> (red-black)',
  module: 'data/map',
  source: b(
    'Written for this site: the course has no map header for std::map, so this one shows the red-black tree that std::map is usually built on (not the professor\'s code). It is set.h with a pair<const KeyT, MappedT> in each node, plus operator[] and at, in the style of map_bst.h. It runs exactly the insert and erase cases of the map Learning module, compiles with g++ -std=c++11 and was tested against std::map.',
    'เขียนขึ้นสำหรับเว็บนี้: วิชานี้ไม่มี header ของ std::map จึงเขียนต้นไม้แดงดำแบบที่ std::map มักใช้ขึ้นมาให้ดู (ไม่ใช่โค้ดของอาจารย์) คือ set.h ที่แต่ละ node เก็บ pair<const KeyT, MappedT> และเพิ่ม operator[] กับ at ในรูปแบบของ map_bst.h ทำกรณีของ insert และ erase ตรงกับโมดูล map ในหน้า Learning ทุกขั้น คอมไพล์ได้ด้วย g++ -std=c++11 และทดสอบเทียบกับ std::map แล้ว',
  ),
  overview: b(
    'A map is a red-black tree of key/value pairs ordered by the key only; the value rides along and never affects the shape. Each node is a pair<const KeyT, MappedT> with left, right, parent and a color. Insert adds a red leaf and fixes colors with at most two rotations, erase relinks the successor node and fixes a missing black with at most three, so the height stays below 2 log2(n + 1) and every lookup or update is O(log n). m[k] inserts k with a default value when it is missing; insert never overwrites; at never inserts and throws instead.',
    'map คือต้นไม้แดงดำของคู่ key/value ที่เรียงตาม key อย่างเดียว ค่า value ติดไปกับ node และไม่มีผลต่อรูปร่างต้นไม้ แต่ละ node เป็น pair<const KeyT, MappedT> พร้อม left, right, parent และสี การ insert เพิ่มใบแดงแล้วซ่อมสีโดยหมุนไม่เกินสองครั้ง การ erase ย้าย node successor มาแทนและซ่อมดำที่ขาดโดยหมุนไม่เกินสามครั้ง ความสูงจึงต่ำกว่า 2 log2(n + 1) และการค้นหรือแก้ไขทุกครั้งเป็น O(log n) m[k] จะ insert k พร้อมค่าเริ่มต้นถ้ายังไม่มี insert ไม่เขียนทับ และ at ไม่ insert แต่ throw แทน',
  ),
  fields: [
    { name: 'mRoot', type: 'node *', ...b('The root, NULL when empty; always black otherwise.', 'ราก เป็น NULL เมื่อว่าง นอกนั้นเป็นสีดำเสมอ') },
    { name: 'mLess', type: 'CompareT', ...b('Compares keys only (std::less<KeyT> by default).', 'เปรียบเทียบเฉพาะ key (ค่าเริ่มต้น std::less<KeyT>)') },
    { name: 'mSize', type: 'size_t', ...b('Number of pairs, updated by insert (and so operator[]), erase and clear.', 'จำนวนคู่ แก้โดย insert (และ operator[] ที่เรียก insert), erase และ clear') },
    { name: 'node::data', type: 'ValueT (pair<const KeyT, MappedT>)', ...b('data.first is the const key, data.second the value you may change.', 'data.first คือ key ที่เป็น const ส่วน data.second คือค่าที่แก้ได้') },
    { name: 'node::left / right / parent', type: 'node *', ...b('Tree links, NULL for none; parent is NULL only at the root.', 'ลิงก์ในต้นไม้ NULL คือไม่มี parent เป็น NULL ที่รากเท่านั้น') },
    { name: 'node::color', type: 'color_t', ...b('RED or BLACK. New nodes are red; the fix-ups recolor.', 'RED หรือ BLACK node ใหม่เป็นแดง fix-up จะเปลี่ยนสี') },
  ],
  invariants: [
    ...rbInvariants,
    b('The order depends on data.first only; changing data.second never breaks any rule.', 'ลำดับขึ้นกับ data.first เท่านั้น การแก้ data.second ไม่ทำให้กฎข้อไหนพัง'),
  ],
  checklist: [
    b('The grader problems use std::map itself. Know the three ways in: m[k] (insert default if missing), insert (never overwrites, .second says if new), at (never inserts, throws).', 'โจทย์ grader ใช้ std::map ตรง ๆ ต้องรู้สามวิธีเข้าถึง: m[k] (insert ค่าเริ่มต้นถ้าไม่มี), insert (ไม่เขียนทับ .second บอกว่าเป็นของใหม่ไหม), at (ไม่ insert แต่ throw)'),
    b('Counting is m[key]++: a new key starts at MappedT() = 0.', 'การนับใช้ m[key]++ ได้เลย key ใหม่เริ่มที่ MappedT() = 0'),
    b('To test membership without inserting, use count(k) or find(k) != end(), never m[k] (it grows the map).', 'ถ้าจะเช็กว่ามี key ไหมโดยไม่ insert ให้ใช้ count(k) หรือ find(k) != end() ห้ามใช้ m[k] (map จะโตขึ้น)'),
    b('Iteration is in key order; it->first is the key, it->second the value. A map does not sort by value: copy the values out and sort them if you need that.', 'การวนเรียงตาม key it->first คือ key และ it->second คือค่า map ไม่ได้เรียงตามค่า ถ้าต้องการให้คัดลอกค่าออกมาแล้ว sort เอง'),
    b('lower_bound / upper_bound work on keys: the first key >= k or > k. For "the entry in effect at key k" use prev(upper_bound(k)).', 'lower_bound / upper_bound ทำงานกับ key ได้ key ตัวแรกที่ >= k หรือ > k ถ้าต้องการ "ข้อมูลที่มีผลอยู่ ณ key k" ใช้ prev(upper_bound(k))'),
    b('A const map& parameter (as in da68_m_count_value) has no operator[]; use find, at or iterators.', 'พารามิเตอร์แบบ const map& (เช่นใน da68_m_count_value) ใช้ operator[] ไม่ได้ ให้ใช้ find, at หรือ iterator'),
  ],
  pitfalls: [
    b('Reading m[k] to check a key: every miss inserts a new entry with value 0, changing size() and the iteration.', 'อ่าน m[k] เพื่อเช็ก key ทุกครั้งที่ไม่เจอจะ insert ข้อมูลใหม่ค่า 0 ทำให้ size() และการวนเปลี่ยน'),
    b('Expecting insert({k, v}) to update an existing key: it returns {it, false} and keeps the old value. Use m[k] = v or it->second = v.', 'คิดว่า insert({k, v}) จะอัปเดต key ที่มีอยู่ ที่จริงคืน {it, false} และเก็บค่าเดิมไว้ ให้ใช้ m[k] = v หรือ it->second = v'),
    ...rbPitfalls({ o: 'm', map: true }),
  ],
  student: {
    ...b(
      'No grader problem extends CP::map; they pass a std::map into the function you write, or let you build one. A typical template helper copies what you need out of the map in key order, for example all the values so they can be sorted and binary-searched (the idea behind da68_m_count_value).',
      'ไม่มีโจทย์ grader ข้อไหนเพิ่มเมธอดให้ CP::map แต่จะส่ง std::map เข้ามาในฟังก์ชันที่เราเขียน หรือให้เราสร้างเอง ฟังก์ชัน template ที่พบบ่อยคือคัดลอกสิ่งที่ต้องการออกจาก map ตามลำดับ key เช่นดึงค่าทั้งหมดออกมาเพื่อ sort แล้วค้นแบบ binary search (แนวคิดของ da68_m_count_value)',
    ),
    code: `#include <map>
#include <vector>
#include <algorithm>

template <typename KeyT, typename MappedT>
std::vector<MappedT> sorted_values(const std::map<KeyT,MappedT>& m) {
  std::vector<MappedT> v;
  for (auto it = m.begin(); it != m.end(); it++)
    v.push_back(it->second);          // keys come in order, values do not
  std::sort(v.begin(), v.end());
  return v;                           // then count a range with upper_bound - lower_bound
}`,
  },
  problems: [
    { name: 'd62_q1a_vote', ...b('Count the votes per name with std::map<string,int> (cnt[name]++), copy the counts into a vector and sort it; the answer is the K-th largest count, or the smallest count when there are fewer than K candidates (ties at the cut all get in, so the count is all that matters).', 'นับคะแนนของแต่ละชื่อด้วย std::map<string,int> (cnt[name]++) คัดลอกจำนวนคะแนนลง vector แล้ว sort คำตอบคือคะแนนที่มากเป็นอันดับ K หรือคะแนนน้อยสุดถ้ามีผู้สมัครไม่ถึง K คน (คนที่คะแนนเท่ากันตรงเส้นได้รับเลือกทั้งหมด จึงสนใจแค่ตัวเลขคะแนน)') },
    { name: 'd62_q1b_grandfather', ...b('Store father[son] in a std::map<long long,long long> (IDs exceed int). A and B are cousins when A != B, both have a father, both fathers have a father, and those grandfathers are equal. Check with find / count, not father[x], or every query inserts. Up to 10^6 pairs, so read fast.', 'เก็บ father[son] ใน std::map<long long,long long> (เลขบัตรเกิน int) A กับ B เป็นลูกพี่ลูกน้องเมื่อ A != B ทั้งคู่มีพ่อ พ่อทั้งสองมีพ่อ และปู่ทั้งสองเป็นคนเดียวกัน เช็กด้วย find / count ห้ามใช้ father[x] เพราะทุกคำถามจะ insert ข้อมูลมีถึง 10^6 คู่ จึงต้องอ่านเร็ว') },
    { name: 'da68_m_count_value', ...b('count_value(const map<long long,int>& data, queries): for each (A, B) count the keys x with A <= data[x] <= B. The map is sorted by key, not value, so copy all the values into a vector, sort it once, and answer each query with upper_bound(B) - lower_bound(A): O((N + M) log N). data is const, so do not use data[x].', 'count_value(const map<long long,int>& data, queries): สำหรับแต่ละ (A, B) นับ key x ที่ A <= data[x] <= B map เรียงตาม key ไม่ใช่ตามค่า จึงคัดลอกค่าทั้งหมดลง vector, sort ครั้งเดียว แล้วตอบแต่ละคำถามด้วย upper_bound(B) - lower_bound(A) ได้ O((N + M) log N) และ data เป็น const จึงใช้ data[x] ไม่ได้') },
    { name: 'da66_m2_change_data', ...b('change_2 gets a std::map<string, pair<priority_queue<int>, int>> and must turn every int equal to from into to. The keys are strings, so walk with an iterator and edit it->second in place: fix .second directly, and rebuild the priority_queue by popping everything, replacing from by to, and pushing back.', 'change_2 รับ std::map<string, pair<priority_queue<int>, int>> และต้องเปลี่ยน int ทุกตัวที่เท่ากับ from เป็น to key เป็น string จึงวนด้วย iterator แล้วแก้ it->second ได้เลย แก้ .second ตรง ๆ และสร้าง priority_queue ใหม่โดย pop ออกทั้งหมด เปลี่ยน from เป็น to แล้ว push กลับ') },
  ],
  regions: mapRegions(),
};
