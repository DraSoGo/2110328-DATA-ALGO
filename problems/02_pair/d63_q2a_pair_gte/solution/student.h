#ifndef __STUDENT_H_
#define __STUDENT_H_

template <typename T1, typename T2>
bool CP::pair<T1,T2>::operator>=(const pair<T1,T2>& other) const {
    if (first > other.first) return 1;
    if (first < other.first) return 0;
    return second >= other.second;
}

#endif