#ifndef __STUDENT_H_
#define __STUDENT_H_

#include <algorithm>
#include <utility>

template <typename T>
void CP::vector<T>::insert_many(CP::vector<std::pair<int,T>> data) {
    size_t n = mSize;
    size_t m = data.size();

    if (m == 0) return;

    std::sort(data.begin(), data.end(),
        [](const std::pair<int,T>& a, const std::pair<int,T>& b) {
            return a.first < b.first;
        });

    T* temp = new T[n + m]();

    size_t i = 0;
    size_t j = 0;
    size_t k = 0;

    while (i < n || j < m) {
        if (j < m && data[j].first == (int)i) {
            temp[k++] = data[j].second;
            j++;
        } else {
            temp[k++] = mData[i++];
        }
    }

    delete[] mData;
    mData = temp;
    mSize = n + m;
    mCap = n + m;
}

#endif
