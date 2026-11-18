// The simple main.cpp students download together with list.h and student.h.
// It is NOT the program the judge runs — see the statement's ข้อบังคับ.
#include "list.h"
#include "student.h"

#include <iostream>

int main()
{
  CP::list<int> a, b;
  int n, m, i, j;

  std::cin >> n;
  for (int k = 0; k < n; ++k)
  {
    int element;
    std::cin >> element;
    a.push_back(element);
  }

  std::cin >> m;
  for (int k = 0; k < m; ++k)
  {
    int element;
    std::cin >> element;
    b.push_back(element);
  }

  // first is i steps after a.begin(), last is j steps after a.begin()
  std::cin >> i >> j;
  CP::list<int>::iterator first = a.begin();
  for (int k = 0; k < i; ++k)
    ++first;
  CP::list<int>::iterator last = a.begin();
  for (int k = 0; k < j; ++k)
    ++last;

  a.extract(first, last, b);

  a.print();
  b.print();
}
