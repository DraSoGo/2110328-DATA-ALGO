#ifndef __STUDENT_H_
#define __STUDENT_H_

using namespace std;

template <typename T>
bool CP::vector<T>::block_swap(iterator a, iterator b, size_t m) {
  if (m == 0)
  {
    return 0;
  }
  if (a < begin() || b < begin())
  {
    return 0;
  }
  if (a+m > end() || b+m > end())
  {
    return 0;
  }
  if (!(a + m <= b || b + m <= a ))
  {
    return 0;
  }
  for (size_t i = 0; i < m; i++)
  {
    swap(*(a+i),*(b+i));
  }
  return 1;
}

#endif
