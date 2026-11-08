#ifndef __STUDENT_H_
#define __STUDENT_H_

#include <set>

template <typename T>
void CP::vector<T>::uniq() {
    std::set<T> seen;
    size_t j = 0;

    for (size_t i = 0; i < mSize; i++) {
        if (seen.insert(mData[i]).second) {
            mData[j++] = mData[i];
        }
    }

    mSize = j;
}

#endif
