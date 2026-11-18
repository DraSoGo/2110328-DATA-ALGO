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
    bool less_by_second(const pair<T1, T2> &other) const;
    bool greater_by_second(const pair<T1, T2> &other) const;

    // already implemented here: "neither one comes first" — the equality
    // that your ordering implies. It is only right if less_by_second really
    // is a strict ordering, so it is false for a pair against itself.
    bool equal_by_second(const pair<T1, T2> &other) const
    {
      return !less_by_second(other) && !other.less_by_second(*this);
    }
  };

} // namespace CP

#endif
