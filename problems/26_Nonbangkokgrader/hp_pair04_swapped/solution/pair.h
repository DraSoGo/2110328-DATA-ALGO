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
    pair<T2, T1> swapped() const;
    void become(const pair<T2, T1> &other);

    // already implemented here: sliding the components across twice has to
    // land back on the original pair, so this calls your swapped() on BOTH
    // pair<T1,T2> and pair<T2,T1>.
    pair<T1, T2> round_trip() const { return swapped().swapped(); }
  };

} // namespace CP

#endif
