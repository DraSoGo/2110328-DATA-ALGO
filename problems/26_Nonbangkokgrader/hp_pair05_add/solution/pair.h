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
    pair<T1, T2> operator+(const pair<T1, T2> &other) const;
    pair<T1, T2> doubled() const;

    // already implemented here: adding `other` twice. It adds a pair to the
    // RESULT of an addition, so your operator+ has to return a usable value,
    // not a reference into a temporary.
    pair<T1, T2> plus_twice(const pair<T1, T2> &other) const { return *this + other + other; }
  };

} // namespace CP

#endif
