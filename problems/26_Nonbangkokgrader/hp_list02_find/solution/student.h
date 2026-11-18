#ifndef _STUDENT_H_INCLUDED
#define _STUDENT_H_INCLUDED
#include "list.h"
using namespace std;

template <typename T>
typename CP::list<T>::iterator CP::list<T>::find(const T &value) const
{
  iterator it = begin();
  while (it != end())
  {
    if (*it == value)
    {
      return it;
    }
    it++;
  }
  return end();
}

#endif
