#ifndef __STACK_STUDENT_H__
#define __STACK_STUDENT_H__
#include "stack.h"
using namespace std;

template <typename T>
void CP::stack<T>::mitosis(int a, int b)
{
    size_t k = b-a+1;
    if (mSize+k > mCap)
    {
        expand(max(mSize+k,2*mCap));
    }
    size_t l = mSize-a-1,f = mSize-b-1;
    size_t idx = mSize+(b-a);
    for (size_t i = mSize-1; i >= l+1; i--)
    {
        mData[idx] = mData[i];
        // cout << idx << "\n";
        idx--;
    }
    for (size_t i = mSize-a-1; i >= mSize-b-1; i--)
    {
        mData[idx] = mData[i];
        idx--;
        mData[idx] = mData[i];
        idx--;
        if (i == 0)
        {
            break;
        }
    }
    mSize += (b-a)+1;
}

#endif