#ifndef _STUDENT_H_INCLUDED
#define _STUDENT_H_INCLUDED
#include "map_bst.h"
using namespace std;

template <typename KeyT, typename MappedT, typename CompareT>
typename CP::map_bst<KeyT, MappedT, CompareT>::iterator
CP::map_bst<KeyT, MappedT, CompareT>::lower_bound(const KeyT &key) const
{
  // Your code here
  return end();
}

#endif
