#ifndef _STUDENT_H_INCLUDED
#define _STUDENT_H_INCLUDED
#include "list.h"
using namespace std;

template <typename T>
size_t CP::list<T>::count(const T &value) const
{
  node *it = mHeader->next;
  size_t ans = 0;
  while (it != mHeader)
  {
    if (it->data == value)
    {
      ans++;
    }
    it = it->next;
  }
  return ans;
}

#endif
