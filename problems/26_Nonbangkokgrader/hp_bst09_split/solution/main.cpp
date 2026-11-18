// The simple main.cpp students download together with map_bst.h and
// student.h. It is NOT the program the judge runs — see the statement's
// ข้อบังคับ.
#include "map_bst.h"
#include "student.h"

#include <iostream>

// Two lines per tree: the size with the two structural checks of map_bst.h,
// then every key:value in tree order.
void show(const char *name, const CP::map_bst<int, int> &m)
{
  std::cout << name << " : size = " << m.size() << ", parent " << (m.checkParent() ? "ok" : "WRONG")
            << ", order " << (m.checkInorder() ? "ok" : "WRONG") << std::endl;
  for (CP::map_bst<int, int>::iterator it = m.begin(); it != m.end(); ++it)
    std::cout << it->first << ":" << it->second << " ";
  std::cout << std::endl;
}

int main()
{
  CP::map_bst<int, int> m, result;
  int n, key;
  std::cin >> n;
  for (int i = 1; i <= n; ++i)
  {
    std::cin >> key;
    m[key] = i;
  }
  std::cin >> key;

  m.split(key, result);

  show("m", m);
  show("result", result);
}
