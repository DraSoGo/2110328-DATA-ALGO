#ifndef __STUDENT_H_
#define __STUDENT_H_

template <typename T>
void CP::vector<T>::erase_many(const std::vector<int> &pos) {
    size_t j = 0;
    size_t k = 0;

    for (size_t i = 0; i < mSize; i++) {
        if (k < pos.size() && i == (size_t)pos[k]) {
            k++;
        } else {
            mData[j++] = mData[i];
        }
    }

    mSize = j;
}

#endif
