#include "priority_queue.h"
#include <utility>
#include <bits/stdc++.h>
using namespace std;

template <typename T, typename Comp>
void CP::priority_queue<T, Comp>::child_swap(size_t k)
{
  queue <int> QL,QR;
  if (2*k+1 < mSize && 2*k+2 < mSize)
  {
    QL.push(2*k+1);
    QR.push(2*k+2);
  }
  while (!QL.empty() && !QL.empty())
  {
    int L = QL.front();
    int R = QR.front();
    QL.pop();
    QR.pop();
    if (2*L+1 < mSize)
    {
      QL.push(2*L+1);
      QR.push(2*R+1);
    }
    if (2*L+2 < mSize)
    {
      QL.push(2*L+2);
      QR.push(2*R+2);
    }
    swap(mData[L],mData[R]);
  }
  return;
}