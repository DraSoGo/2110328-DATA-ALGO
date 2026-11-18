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
    pair<T1, T2> &operator+=(const pair<T1, T2> &other);
    pair<T1, T2> &absorb_twice(const pair<T1, T2> &other);

    // already implemented here: + is written on top of your +=, exactly the
    // way the standard library pairs the two operators. The two therefore
    // agree by construction — and a += that does not update *this leaves
    // this + broken as well.
    pair<T1, T2> operator+(const pair<T1, T2> &other) const
    {
      pair<T1, T2> result(*this);
      result += other;
      return result;
    }
  };

} // namespace CP

#endif
