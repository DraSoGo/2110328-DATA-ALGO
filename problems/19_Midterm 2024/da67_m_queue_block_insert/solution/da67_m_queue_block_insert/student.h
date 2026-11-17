#ifndef __STUDENT_H_
#define __STUDENT_H_

#include "queue.h"
#include <vector>
using namespace std;

template <typename T>
void CP::queue<T>::block_insert(size_t p, size_t m, const T &element)
{
	ensureCapacity(mSize+m);
	if (p < mSize-p)
	{
		auto omFront = mFront;
		mFront = (mFront+mCap-m)%mCap;
		for (size_t i = 0; i < p; i++)
		{
			mData[(i+mFront)%mCap] = mData[(i+omFront)%mCap];
		}
	}
	else
	{
		for (size_t i = mSize; i > p; i--)
		{
			mData[(i+m-1+mFront)%mCap] = mData[(i-1+mFront)%mCap];
		}
	}
	for (size_t i = p; i < p+m; i++)
	{
		mData[(i+mFront)%mCap] = element;
	}
	mSize += m;
}

#endif