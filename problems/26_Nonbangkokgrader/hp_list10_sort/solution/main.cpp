// The simple main.cpp students download together with list.h and student.h.
// It is NOT the program the judge runs — see the statement's ข้อบังคับ.
#include "list.h"
#include "student.h"

#include <iostream>

int main()
{
  CP::list<int> l;
  int n;

  std::cin >> n;
  for (int i = 0; i < n; ++i)
  {
    int element;
    std::cin >> element;
    l.push_back(element);
  }

  l.sort();

  l.print();
}
