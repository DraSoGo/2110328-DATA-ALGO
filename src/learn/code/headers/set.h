// Written for this site: a red-black tree like the one inside std::set / std::map (not the professor's code).
// It follows map_bst.h (node with parent pointers, child_link, find_node, the same iterator) and adds one color per node.
#ifndef _CP_SET_INCLUDED_
#define _CP_SET_INCLUDED_

#include <iostream>
#include <functional>
#include <utility>
//#pragma once

namespace CP {

template <typename KeyT,
          typename CompareT = std::less<KeyT> >
class set
{
  protected:

    typedef KeyT ValueT;

    enum color_t { RED, BLACK };

    class node {
      friend class set;
      protected:
        ValueT  data;
        node   *left;
        node   *right;
        node   *parent;
        color_t color;

        node(const ValueT& data, node* left, node* right, node* parent, color_t color) :
          data ( data ), left( left ), right( right ), parent( parent ), color( color ) { }
    };

    //-------------------------------------------------------------
    class tree_iterator {
      protected:
        node* ptr;

      public:
        tree_iterator() : ptr( NULL ) { }

        tree_iterator(node *a) : ptr(a) { }

        tree_iterator& operator++() {
          if (ptr->right == NULL) {
            node *parent = ptr->parent;
            while (parent != NULL && parent->right == ptr) {
              ptr = parent;
              parent = ptr->parent;
            }
            ptr = parent;
          } else {
            ptr = ptr->right;
            while (ptr->left != NULL)
              ptr = ptr->left;
          }
          return (*this);
        }

        tree_iterator& operator--() {
          if (ptr->left == NULL) {
            node *parent = ptr->parent;
            while (parent != NULL && parent->left == ptr) {
              ptr = parent;
              parent = ptr->parent;
            }
            ptr = parent;
          } else {
            ptr = ptr->left;
            while (ptr->right != NULL)
              ptr = ptr->right;
          }
          return (*this);
        }

        tree_iterator operator++(int) {
          tree_iterator tmp(*this);
          operator++();
          return tmp;
        }

        tree_iterator operator--(int) {
          tree_iterator tmp(*this);
          operator--();
          return tmp;
        }

        // the key decides the node's place in the tree, so it is read-only
        const ValueT& operator*()  { return ptr->data;    }
        const ValueT* operator->() { return &(ptr->data); }
        bool    operator==(const tree_iterator& other) { return other.ptr == ptr; }
        bool    operator!=(const tree_iterator& other) { return other.ptr != ptr; }
    };

   //-------------------------------------------------------------
    node     *mRoot;
    CompareT  mLess;
    size_t    mSize;

  public:
    typedef tree_iterator iterator;

  protected:
    node* &child_link(node* parent, const KeyT& k) {
        if (parent == NULL) return mRoot;
        return mLess(k, parent->data) ?
               parent->left : parent->right;
    }
    int compare(const KeyT& k1, const KeyT& k2) {
      if (mLess(k1, k2)) return -1;
      if (mLess(k2, k1)) return +1;
      return 0;
    }
    node* find_node(const KeyT& k,node* r, node* &parent) {
      node *ptr = r;
      while (ptr != NULL) {
        int cmp = compare(k, ptr->data);
        if (cmp == 0) return ptr;
        parent = ptr;
        ptr = cmp < 0 ? ptr->left : ptr->right;
      }
      return NULL;
    }

    node* find_min_node(node* r) {
      //r must not be NULL
      node *min = r;
      while (min->left != NULL) {
        min = min->left;
      }
      return min;
    }

    node* copy(node* src, node* parent) {
        if (src == NULL) return NULL;
        node* tmp   = new node(src->data, NULL, NULL, parent, src->color);
        tmp->left   = copy(src->left,  tmp);
        tmp->right  = copy(src->right, tmp);
        return tmp;
    }
    void delete_all_nodes(node *r) {
        if (r == NULL) return;
        delete_all_nodes(r->left);
        delete_all_nodes(r->right);
        delete r;
    }

    //------------- red-black helpers -------------------
    // an empty link (NULL) counts as black
    bool is_red(node *n) {
      return n != NULL && n->color == RED;
    }

    // make parent point to next where it pointed to child (parent == NULL means mRoot)
    void relink(node *parent, node *child, node *next) {
      if (parent == NULL) mRoot = next;
      else if (parent->left == child) parent->left = next;
      else parent->right = next;
      if (next != NULL) next->parent = parent;
    }

    // x's right child y moves up, x becomes y's left child
    void rotate_left(node *x) {
      node *y = x->right;
      x->right = y->left;
      if (y->left != NULL) y->left->parent = x;
      relink(x->parent, x, y);
      y->left = x;
      x->parent = y;
    }

    // x's left child y moves up, x becomes y's right child
    void rotate_right(node *x) {
      node *y = x->left;
      x->left = y->right;
      if (y->right != NULL) y->right->parent = x;
      relink(x->parent, x, y);
      y->right = x;
      x->parent = y;
    }

    // z is a new red node; repair "a red node never has a red child"
    void insert_fixup(node *z) {
      while (z->parent != NULL && z->parent->color == RED) {
        node *p = z->parent;
        node *g = p->parent;              // p is red, so p is not the root
        bool p_is_left = (g->left == p);
        node *u = p_is_left ? g->right : g->left;
        if (is_red(u)) {
          // case 1: red uncle -> recolor, the problem may move up to g
          p->color = BLACK;
          u->color = BLACK;
          g->color = RED;
          z = g;
          continue;
        }
        if ((p->left == z) != p_is_left) {
          // case 2: black uncle, z is an inner child (triangle) -> rotate p to make a line
          if (p_is_left) rotate_left(p);
          else           rotate_right(p);
          z = p;
          p = z->parent;
        }
        // case 3: black uncle, z is an outer child (line) -> rotate g and recolor
        if (p_is_left) rotate_right(g);
        else           rotate_left(g);
        p->color = BLACK;
        g->color = RED;
        break;
      }
      mRoot->color = BLACK;
    }

    // x (maybe NULL, then xp is its parent) carries one extra black
    void erase_fixup(node *x, node *xp) {
      while (x != mRoot && !is_red(x)) {
        bool x_is_left = (xp->left == x) && (x != NULL || xp->right != NULL);
        node *w = x_is_left ? xp->right : xp->left;   // sibling, never NULL here
        if (is_red(w)) {
          // case 1: red sibling -> recolor and rotate xp, x gets a black sibling
          w->color  = BLACK;
          xp->color = RED;
          if (x_is_left) rotate_left(xp);
          else           rotate_right(xp);
          continue;
        }
        node *near_child = x_is_left ? w->left  : w->right;
        node *far_child  = x_is_left ? w->right : w->left;
        if (!is_red(near_child) && !is_red(far_child)) {
          // case 2: black sibling with two black children -> w red, the extra black moves up
          w->color = RED;
          x  = xp;
          xp = x->parent;
          continue;
        }
        if (!is_red(far_child)) {
          // case 3: near child red, far child black -> rotate w, the far child becomes red
          near_child->color = BLACK;
          w->color = RED;
          if (x_is_left) rotate_right(w);
          else           rotate_left(w);
          continue;
        }
        // case 4: far child red -> recolor and rotate xp, the extra black is absorbed
        w->color  = xp->color;
        xp->color = BLACK;
        far_child->color = BLACK;
        if (x_is_left) rotate_left(xp);
        else           rotate_right(xp);
        return;
      }
      if (x != NULL) x->color = BLACK;
    }

  public:
    //-------------- constructor & copy operator ----------

    // copy constructor
    set(const set<KeyT,CompareT> & other) :
      mLess(other.mLess) , mSize(other.mSize)
    {
        mRoot = copy(other.mRoot, NULL);
    }

    // default constructor
    set(const CompareT& c = CompareT() ) :
      mRoot(NULL), mLess(c) , mSize(0)
    { }

    // copy assignment operator using copy-and-swap idiom
    set<KeyT,CompareT>& operator=(set<KeyT,CompareT> other)  {
      using std::swap;
      swap(this->mRoot, other.mRoot);
      swap(this->mLess, other.mLess);
      swap(this->mSize, other.mSize);
      return *this;
    }

    ~set() {
      clear();
    }

    //------------- capacity function -------------------
    bool empty() {
      return mSize == 0;
    }

    size_t size() {
      return mSize;
    }

    //----------------- iterator ---------------
    iterator begin() {
      return iterator(mRoot==NULL ? NULL : find_min_node(mRoot));
    }

    iterator end() {
      return iterator(NULL);
    }

    //----------------- modifier -------------
    void clear() {
      delete_all_nodes(mRoot);
      mRoot = NULL;
      mSize = 0;
    }

    std::pair<iterator,bool> insert(const ValueT& val) {
      node *parent = NULL;
      node *ptr = find_node(val,mRoot,parent);
      if (ptr != NULL) return std::make_pair(iterator(ptr), false);
      ptr = new node(val,NULL,NULL,parent,RED);   // a new node is always red
      child_link(parent, val) = ptr;
      mSize++;
      insert_fixup(ptr);
      return std::make_pair(iterator(ptr), true);
    }

    size_t erase(const KeyT &key) {
      node *parent = NULL;
      node *z = find_node(key,mRoot,parent);
      if (z == NULL) return 0;
      color_t removed = z->color;
      node *x, *xp;
      if (z->left == NULL || z->right == NULL) {
        // zero or one child: the child (maybe NULL) takes z's place
        x  = (z->left != NULL) ? z->left : z->right;
        xp = z->parent;
        relink(z->parent, z, x);
      } else {
        // two children: relink the successor NODE y into z's place (no data is copied)
        node *y = find_min_node(z->right);
        removed = y->color;
        x = y->right;
        if (y->parent == z) {
          xp = y;
        } else {
          xp = y->parent;
          relink(xp, y, x);
          y->right = z->right;
          y->right->parent = y;
        }
        relink(z->parent, z, y);
        y->left = z->left;
        y->left->parent = y;
        y->color = z->color;
      }
      delete z;
      mSize--;
      if (removed == BLACK && mRoot != NULL) erase_fixup(x, xp);
      return 1;
    }

    //----------------- lookup -------------
    iterator find(const KeyT &key) {
      node *parent;
      node *ptr = find_node(key,mRoot,parent);
      return ptr == NULL ? end() : iterator(ptr);
    }

    size_t count(const KeyT &key) {
      node *parent;
      return find_node(key,mRoot,parent) == NULL ? 0 : 1;
    }

    // first element >= key
    iterator lower_bound(const KeyT &key) {
      node *ptr = mRoot, *ans = NULL;
      while (ptr != NULL) {
        if (!mLess(ptr->data, key)) {
          ans = ptr;
          ptr = ptr->left;
        } else {
          ptr = ptr->right;
        }
      }
      return iterator(ans);
    }

    // first element > key
    iterator upper_bound(const KeyT &key) {
      node *ptr = mRoot, *ans = NULL;
      while (ptr != NULL) {
        if (mLess(key, ptr->data)) {
          ans = ptr;
          ptr = ptr->left;
        } else {
          ptr = ptr->right;
        }
      }
      return iterator(ans);
    }

    //----------------- debugging -------------
    void print_node(node *n,size_t depth) {
      if (n != NULL) {
        print_node(n->right,depth+1);
        for (size_t i = 0;i < depth;i++) std::cout << "--";
        std::cout << " " << n->data << (n->color == RED ? " (R)" : " (B)") << std::endl;
        print_node(n->left,depth+1);
      }
    }

    void print() {
      std::cout << " ======== size = " << mSize << " ========= " << std::endl;
      print_node(mRoot,0);
    }

    // black height of r, or -1 if a red node has a red child or two paths differ
    int black_height(node *r) {
      if (r == NULL) return 1;
      if (is_red(r) && (is_red(r->left) || is_red(r->right))) return -1;
      int hL = black_height(r->left);
      int hR = black_height(r->right);
      if (hL == -1 || hR == -1 || hL != hR) return -1;
      return hL + (r->color == BLACK ? 1 : 0);
    }

    bool checkRedBlack() {
      return !is_red(mRoot) && black_height(mRoot) != -1;
    }

    // practice: declare your own method here and write its body in student.h (no grader problem extends this class)
};

}

#endif
