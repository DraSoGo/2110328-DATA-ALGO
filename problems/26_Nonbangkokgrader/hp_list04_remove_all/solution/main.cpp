// The simple main.cpp students download together with list.h and student.h.
// It is NOT the program the judge runs — see the statement's ข้อบังคับ.
#include "list.h"
#include "student.h"

#include <iostream>

int main()
{
  CP::list<int> l;
  int n, value;

  std::cin >> n;
  for (int i = 0; i < n; ++i)
  {
    int element;
    std::cin >> element;
    l.push_back(element);
  }

  std::cin >> value;
  size_t removed = l.remove_all(value);

  std::cout << "Removed = " << removed << std::endl;
  l.print();
}
