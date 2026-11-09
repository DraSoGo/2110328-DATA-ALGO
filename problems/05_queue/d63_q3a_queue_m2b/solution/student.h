#ifndef __STUDENT_H_
#define __STUDENT_H_

#include <algorithm>
#include <iostream>
using namespace std;

template <typename T>
void CP::queue<T>::move_to_back(size_t pos)
{
  auto tmp = mData[(mFront+pos)%mCap];
  for (size_t i = pos; i < mSize-1; i++)
  {
    mData[(i+mFront)%mCap] = mData[(mFront+i+1)%mCap];
  }
  mData[(mFront+mSize-1) % mCap] = tmp;
}

#endif