#ifndef __STUDENT_H__
#define __STUDENT_H__

#include <algorithm>
#include <vector>
#include "priority_queue.h"
using namespace std;

template <typename T,typename Comp >
class byorder
{
  public:
    Comp c;
    byorder(Comp c) : c(c) {}
    bool operator()(const T &a,const T &b)const
    {
      return c(b,a);
    }
};

template <typename T,typename Comp >
T CP::priority_queue<T,Comp>::get_kth(size_t k) const {
  vector <T> V;
  for (size_t i = 0; i < mSize && i < 7; i++)
  {
    V.push_back(mData[i]);
  }
  sort(V.begin(),V.end(),byorder<T,Comp>(mLess));
  return V[k-1];
}

#endif
