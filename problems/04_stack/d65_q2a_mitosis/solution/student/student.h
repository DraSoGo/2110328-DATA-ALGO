#ifndef __STACK_STUDENT_H__
#define __STACK_STUDENT_H__
#include "stack.h"

template <typename T>
void CP::stack<T>::mitosis(int a, int b)
{
    expand(mSize+(b-a)+1);
    size_t l = mSize-a,f = mSize - b;
    int c = 0;
    for (size_t i = mSize; i >= l+1; i--)
    {
        c++;
    }
}

#endif