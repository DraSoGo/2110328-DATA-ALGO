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
    bool operator==(const pair<T1, T2> &other) const;
    bool operator!=(const pair<T1, T2> &other) const;
    bool operator<(const pair<T1, T2> &other) const;
    bool operator<=(const pair<T1, T2> &other) const;
    bool operator>(const pair<T1, T2> &other) const;
    bool operator>=(const pair<T1, T2> &other) const;

    const pair<T1, T2> &clamp(const pair<T1, T2> &low, const pair<T1, T2> &high) const;

    // already implemented here: -1 / 0 / +1 from your < alone. Exactly one
    // of the three answers can be right for any two pairs, so a < that is
    // not a strict total order makes this function lie.
    int compare_sign(const pair<T1, T2> &other) const
    {
      if (*this < other)
        return -1;
      if (other < *this)
        return 1;
      return 0;
    }
  };

} // namespace CP

#endif
