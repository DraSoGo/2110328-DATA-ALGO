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
    void normalize();
    bool sorted() const;

    // already implemented here: normalising twice in a row. A correct
    // normalize() is idempotent, so this must leave exactly the same pair
    // behind as a single call.
    void normalize_twice() { normalize(); normalize(); }
  };

} // namespace CP

#endif
