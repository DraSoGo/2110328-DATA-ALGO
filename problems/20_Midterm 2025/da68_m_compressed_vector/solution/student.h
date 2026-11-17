#ifndef __STUDENT_H_
#define __STUDENT_H_

#include "compressed_vector.h"
#include <cstdlib>

template <typename T>
void CP::CompressedVector<T>::expand(size_t capacity)
{
  T *arr = new T[capacity]();
  for (size_t i = 0; i < mSize; i++)
  {
    arr[i] = mDataV[i];
  }
  delete[] mDataV;
  mDataV = arr;
  size_t *arr2 = new size_t[capacity]();
  for (size_t i = 0; i < mSize; i++)
  {
    arr2[i] = mDataL[i];
  }
  delete[] mDataL;
  mDataL = arr2;
  mCap = capacity;
}

template <typename T>
void CP::CompressedVector<T>::insert(int index, const T &element)
{
  int i = 0,sum = 0;
  while (sum < index && i < mSize)
  {
    sum += mDataL[i];
    i++;
  }
  // std::cout << i << "\n";
  if (i != 0 && mDataV[i-1] == element)
  {
    mDataL[i-1]++;
  }
  else if (i < mSize && mDataV[i] == element)
  {
    mDataL[i]++;
  }
  else
  {
    ensureCapacity(mSize+1);
    for (int j = mSize-1; j >= i; j--)
    {
      mDataV[j+1] = mDataV[j];
      mDataL[j+1] = mDataL[j];
    }
    mDataV[i] = element;
    mDataL[i] = 1;
    mSize++;
  }
  
}

template <typename T>
T &CP::CompressedVector<T>::operator[](int index) const
{
  int i = 0,sum = 0;
  while (sum <= index && i < mSize)
  {
    sum += mDataL[i];
    i++;
  }
  return mDataV[i-1];
}

#endif
