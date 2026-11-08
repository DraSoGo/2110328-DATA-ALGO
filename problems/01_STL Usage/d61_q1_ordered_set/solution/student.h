#ifndef __STUDENT_H_
#define __STUDENT_H_

#include <vector>
#include <set>
using namespace std;

template <typename T>
vector<T> Union(const vector<T>& A, const vector<T>& B) {
    vector<T> v;
    set<T> seen;

    for (const T& x : A) {
        v.push_back(x);
        seen.insert(x);
    }

    for (const T& x : B) {
        if (seen.insert(x).second) {
            v.push_back(x);
        }
    }

    return v;
}

template <typename T>
vector<T> Intersect(const vector<T>& A, const vector<T>& B) {
    vector<T> v;
    set<T> seen(B.begin(), B.end());

    for (const T& x : A) {
        if (seen.count(x)) {
            v.push_back(x);
        }
    }

    return v;
}

#endif
