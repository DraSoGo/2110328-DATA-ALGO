// The simple main.cpp students download together with map_bst.h and
// student.h. It is NOT the program the judge runs — see the statement's
// ข้อบังคับ.
#include "map_bst.h"
#include "student.h"

#include <iostream>

int main()
{
  CP::map_bst<int, int> m;
  int n;
  std::cin >> n;
  for (int i = 1; i <= n; ++i)
  {
    int key;
    std::cin >> key;
    m[key] = i;
  }

  std::cout << "height before = " << m.tree_height() << std::endl;
  m.rebalance();
  std::cout << "height after = " << m.tree_height() << std::endl;

  // The shape after rebalance() is not unique, so it is not printed here.
  // Call m.print() yourself to look at the tree you built.
  std::cout << "size = " << m.size() << ", parent " << (m.checkParent() ? "ok" : "WRONG")
            << ", order " << (m.checkInorder() ? "ok" : "WRONG") << std::endl;
  for (CP::map_bst<int, int>::iterator it = m.begin(); it != m.end(); ++it)
    std::cout << it->first << ":" << it->second << " ";
  std::cout << std::endl;
}
