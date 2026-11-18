#ifndef _STUDENT_H_INCLUDED
#define _STUDENT_H_INCLUDED
#include "list.h"
using namespace std;

template <typename T>
void CP::list<T>::move_to_front(iterator it)
{
  node* idx = it.ptr;
  idx->prev->next = idx->next;
  idx->next->prev = idx->prev;

  node* first = mHeader->next;
  idx->prev = mHeader;
  idx->next = first;
  mHeader->next = idx;
  first->prev = idx;
}

#endif
