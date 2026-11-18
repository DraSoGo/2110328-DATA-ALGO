// The simple main.cpp students download together with list.h and student.h.
// It is NOT the program the judge runs — see the statement's ข้อบังคับ.
#include "list.h"
#include "student.h"

#include <iostream>

int main()
{
  CP::list<int> a, b;
  int n, m, k;

  std::cin >> n;
  for (int i = 0; i < n; ++i)
  {
    int element;
    std::cin >> element;
    a.push_back(element);
  }

  std::cin >> m;
  for (int i = 0; i < m; ++i)
  {
    int element;
    std::cin >> element;
    b.push_back(element);
  }

  std::cin >> k;
  CP::list<int>::iterator pos = a.begin();
  for (int i = 0; i < k; ++i)
    ++pos;

  a.splice(pos, b);

  a.print();
  b.print();
}
