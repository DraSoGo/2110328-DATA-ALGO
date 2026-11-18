// The simple main.cpp students download together with list.h and student.h.
// It is NOT the program the judge runs — see the statement's ข้อบังคับ.
#include "list.h"
#include "student.h"

#include <iostream>

int main()
{
  CP::list<int> l;
  int n, q;

  std::cin >> n;
  for (int i = 0; i < n; ++i)
  {
    int element;
    std::cin >> element;
    l.push_back(element);
  }

  std::cin >> q;
  for (int i = 0; i < q; ++i)
  {
    int k;
    std::cin >> k;
    CP::list<int>::iterator it = l.begin();
    for (int step = 0; step < k; ++step)
      ++it;

    l.move_to_front(it);
  }

  l.print();
}
