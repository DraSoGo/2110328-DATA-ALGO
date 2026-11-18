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

  int q;
  std::cin >> q;
  for (int i = 0; i < q; ++i)
  {
    int a, b;
    std::cin >> a >> b;
    // a and b are keys of the tree, so find() never returns end() here
    CP::map_bst<int, int>::iterator it = m.lca(m.find(a), m.find(b));
    if (it == m.end())
      std::cout << "end" << std::endl;
    else
      std::cout << it->first << ":" << it->second << std::endl;
  }
}
