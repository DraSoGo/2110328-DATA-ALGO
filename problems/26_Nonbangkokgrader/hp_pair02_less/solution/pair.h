#ifndef _CP_PAIR_INCLUDED_
#define _CP_PAIR_INCLUDED_

#include <iostream>

namespace CP
{

  template <typename T1, typename T2>
  class pair
  {
  public:
    T1 first;
    T2 second;

    // default constructor, using list initialization
    pair() : first(), second() {}

    // custom constructor, using list initialization
    pair(const T1 &a, const T2 &b) : first(a), second(b) {}

    // we have no destructor: pair owns no resource

    // for student.h
    bool operator<(const pair<T1, T2> &other) const;
    void make_min(const pair<T1, T2> &other);

    // already implemented here: > is written as "the other one is smaller",
    // so it reuses your < with the operands swapped.
    bool operator>(const pair<T1, T2> &other) const { return other < *this; }
  };

} // namespace CP

#endif
