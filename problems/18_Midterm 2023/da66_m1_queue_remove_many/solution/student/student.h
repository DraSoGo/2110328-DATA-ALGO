#ifndef __STUDENT_H_
#define __STUDENT_H_

#include <vector>
#include "queue.h"
#include <algorithm>

template <typename T>
void CP::queue<T>::remove_many(std::vector<size_t> pos)
{
  size_t k = 0;
  sort(pos.begin(),pos.end());
  for (size_t i = 0; i < mSize; i++)
  {
    if(k < pos.size() && i == pos[k])
    {
      k++;
      continue;
    }
    mData[(i-k+mFront)%mCap] = mData[(i+mFront)%mCap];
  }
  mSize -= pos.size();
}

#endif
