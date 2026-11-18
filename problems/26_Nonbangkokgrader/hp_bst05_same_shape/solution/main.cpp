// The simple main.cpp students download together with map_bst.h and
// student.h. It is NOT the program the judge runs — see the statement's
// ข้อบังคับ.
#include "map_bst.h"
#include "student.h"

#include <iostream>

void read_tree(CP::map_bst<int, int> &m)
{
  int n;
  std::cin >> n;
  for (int i = 1; i <= n; ++i)
  {
    int key;
    std::cin >> key;
    m[key] = i;
  }
}

int main()
{
  int t;
  std::cin >> t;
  for (int i = 0; i < t; ++i)
  {
    CP::map_bst<int, int> a, b;
    read_tree(a);
    read_tree(b);
    if (a.same_shape(b))
      std::cout << "YES" << std::endl;
    else
      std::cout << "NO" << std::endl;
  }
}
