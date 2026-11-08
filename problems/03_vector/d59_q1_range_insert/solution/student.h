#ifndef __STUDENT_H_
#define __STUDENT_H_

template <typename T>
void CP::vector<T>::insert(iterator position, iterator first, iterator last) {
    size_t index = position - mData;
    size_t count = last - first;

    if (count == 0) return;

    ensureCapacity(mSize + count);

    for (size_t i = mSize; i > index; i--) {
        mData[i + count - 1] = mData[i - 1];
    }

    for (size_t i = 0; i < count; i++) {
        mData[index + i] = first[i];
    }

    mSize += count;
}

#endif
