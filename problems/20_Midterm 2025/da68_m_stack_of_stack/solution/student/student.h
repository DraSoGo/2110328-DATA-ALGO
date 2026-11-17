#ifndef __STUDENT_H_
#define __STUDENT_H_

#include "stack.h"
#include <vector>
using namespace std;
// can include other libs or write util funtion here

template <typename T>
void CP::stack<T>::push(const T &value)
{
    if (mData.empty() || mData.back().size() == mData.size())
    {
        mData.push_back(vector <T> ());
    }
    mData.back().push_back(value);
    mSize++;
}

template <typename T>
void CP::stack<T>::pop()
{
    if (size() == 0)
    throw std::out_of_range("index of out range");
    mData.back().pop_back();
    if (mData.back().empty())
    {
        mData.pop_back();
    }
    mSize--;
}

template <typename T>
size_t CP::stack<T>::size() const
{
    // int sz = mData.size()-1;
    // int sum = 0;
    // sum += (sz+1)*sz/2;
    // if (sz % 2 == 1)
    // {
    //     sum += (sz+1)/2;
    // }
    // sum += mData.back().size();
    return mSize;
}

template <typename T>
const T &CP::stack<T>::top() const
{
    if (size() == 0)
    throw std::out_of_range("index of out range");
    return mData.back().back();
}

/*
Push and pop with steady hand,
or tears may fall from teacher’s stand.
*/

#endif