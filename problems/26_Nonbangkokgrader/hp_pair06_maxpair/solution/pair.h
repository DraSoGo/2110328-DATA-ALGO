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
    const pair<T1, T2> &larger(const pair<T1, T2> &other) const;
    const pair<T1, T2> &larger3(const pair<T1, T2> &b, const pair<T1, T2> &c) const;

    // already implemented here: "did I win?" is answered by comparing the
    // ADDRESS the reference points at with my own address. It therefore only
    // works if larger() hands back one of the two objects it was given.
    bool dominates(const pair<T1, T2> &other) const { return &larger(other) == this; }
  };

} // namespace CP

#endif
