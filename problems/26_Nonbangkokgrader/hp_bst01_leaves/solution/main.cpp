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

  // the empty tree first, then once more after every insertion
  std::cout << m.count_leaves() << std::endl;
  for (int i = 1; i <= n; ++i)
  {
    int key;
    std::cin >> key;
    m[key] = i;
    std::cout << m.count_leaves() << std::endl;
  }
}
