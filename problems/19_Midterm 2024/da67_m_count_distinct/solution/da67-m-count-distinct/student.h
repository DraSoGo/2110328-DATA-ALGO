#ifndef __STUDENT_H_
#define __STUDENT_H_

#include "vector.h"
#include <bits/stdc++.h>
using namespace std;

template <typename T>
size_t CP::vector<T>::count_distinct(CP::vector<T>::iterator a, CP::vector<T>::iterator b)
{
    set <T> S;
    for (auto i = a; i != b; i++)
    {
        S.insert(*i);
    }
    return S.size();
}

#endif