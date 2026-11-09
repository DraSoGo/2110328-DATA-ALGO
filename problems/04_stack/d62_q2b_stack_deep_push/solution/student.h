#ifndef __STUDENT_H_
#define __STUDENT_H_

template <typename T>
void CP::stack<T>::deep_push(size_t pos, const T &value)
{
  ensureCapacity(mSize+1);
  size_t idx = mSize-pos;
  for (size_t i = mSize; i > idx; i--)
  {
    mData[i] = mData[i-1];
  }
  mData[idx] = value;
  mSize++;
}

#endif
