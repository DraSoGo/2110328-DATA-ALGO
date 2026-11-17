#ifndef __STUDENT_H__
#define __STUDENT_H__

#include "list.h"

template <typename T>
size_t CP::list<T>::fix_wrong()
{
  size_t co = 0;
  node *p = mHeader;
  while (p->next != mHeader)
  {
    node *q = p->next;
    if (q->prev != p)
    {
      q->prev = p;
      co++;
    }
    p = q;
  }
  return co;
}

#endif