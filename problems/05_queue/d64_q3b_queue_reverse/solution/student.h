#ifndef __STUDENT_H_
#define __STUDENT_H_

#include <cassert>
#include <bits/stdc++.h>
using namespace std;

template <typename T>
void CP::queue<T>::reverse(int a, int b)
{
  int k = 0;
  for (size_t i = a; i <= a+((b-a)/2); i++)
  {
    swap(mData[(mFront+i)%mCap],mData[(mFront+b-k)%mCap]);
    k++;
  }
}

#endif
