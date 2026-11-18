
#ifndef __STUDENT_H_
#define __STUDENT_H_

#include "map_bst.h"

template <typename KeyT,
          typename MappedT,
          typename CompareT>
typename CP::map_bst<KeyT, MappedT, CompareT>::iterator CP::map_bst<KeyT, MappedT, CompareT>::recursive(node *n, CP::map_bst<KeyT, MappedT, CompareT>::iterator p, CP::map_bst<KeyT, MappedT, CompareT>::iterator q) const
{
}

template <typename KeyT,
          typename MappedT,
          typename CompareT>
typename CP::map_bst<KeyT, MappedT, CompareT>::iterator CP::map_bst<KeyT, MappedT, CompareT>::lca(CP::map_bst<KeyT, MappedT, CompareT>::iterator p, CP::map_bst<KeyT, MappedT, CompareT>::iterator q) const
{
    KeyT a = p->first, b = q->first;
    node *n = mRoot;
    while (1)
    {
        if (mLess(a, n->data.first) && mLess(b, n->data.first))
        {
            n = n->left;
        }
        else if (mLess(n->data.first, a) && mLess(n->data.first, b))
        {
            n = n->right;
        }
        else
        {
            return iterator(n);
        }
    }
}

#endif
