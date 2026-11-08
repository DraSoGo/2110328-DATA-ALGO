#ifndef __STUDENT_H_
#define __STUDENT_H_

template <typename T>
void CP::vector<T>::compress() {
    if (mCap == mSize) return;

    T *temp = new T[mSize]();

    for (size_t i = 0; i < mSize; i++) {
        temp[i] = mData[i];
    }

    delete[] mData;
    mData = temp;
    mCap = mSize;
}

#endif
