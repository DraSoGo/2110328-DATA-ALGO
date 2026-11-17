#ifndef __STUDENT_H_
#define __STUDENT_H_
#include <algorithm>

template <typename T>
void CP::list<T>::merge(CP::list<CP::list<T>> &ls)
{
  for (auto it = ls.begin(); it != ls.end(); it++)
  {
    CP::list<T> &L = *it;
    if (L.mSize == 0)
    {
      continue;
    }

    node *f = L.mHeader->next;
    node *l = L.mHeader->prev;
    node *t = mHeader->prev;

    t->next = f;
    f->prev = t;
    l->next = mHeader;
    mHeader->prev = l;
    mSize += L.mSize;

    L.mHeader->next = L.mHeader;
    L.mHeader->prev = L.mHeader;
    L.mSize = 0;
  }
}

#endif