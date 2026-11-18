#ifndef _CP_LIST_INCLUDED_
#define _CP_LIST_INCLUDED_

#include <cstddef>
#include <iostream>
#include <stdexcept>
#include <utility>

namespace CP
{

  // A circular doubly linked list with a header node.
  //
  //   mHeader->next  is the first element (or mHeader itself when empty)
  //   mHeader->prev  is the last element  (or mHeader itself when empty)
  //
  // The header node carries no element; end() points at it.
  template <typename T>
  class list
  {
  protected:
    class node
    {
      friend class list;

    public:
      T data;
      node *prev;
      node *next;

      node() : data(T()), prev(this), next(this) {}

      node(const T &data, node *prev, node *next)
          : data(T(data)), prev(prev), next(next) {}
    };

    class list_iterator
    {
      friend class list;

    protected:
      node *ptr;

    public:
      list_iterator() : ptr(NULL) {}

      list_iterator(node *a) : ptr(a) {}

      list_iterator &operator++()
      {
        ptr = ptr->next;
        return (*this);
      }

      list_iterator &operator--()
      {
        ptr = ptr->prev;
        return (*this);
      }

      list_iterator operator++(int)
      {
        list_iterator tmp(*this);
        operator++();
        return tmp;
      }

      list_iterator operator--(int)
      {
        list_iterator tmp(*this);
        operator--();
        return tmp;
      }

      T &operator*() { return ptr->data; }
      T *operator->() { return &(ptr->data); }
      bool operator==(const list_iterator &other) const { return other.ptr == ptr; }
      bool operator!=(const list_iterator &other) const { return other.ptr != ptr; }
    };

  public:
    typedef list_iterator iterator;

  protected:
    node *mHeader; // pointer to the header node
    size_t mSize;

  public:
    //-------------- constructor & copy operator ----------

    // copy constructor
    list(const list<T> &a) : mHeader(new node()), mSize(0)
    {
      for (iterator it = a.begin(); it != a.end(); it++)
      {
        push_back(*it);
      }
    }

    // default constructor
    list() : mHeader(new node()), mSize(0) {}

    // copy assignment operator, using the copy-and-swap idiom
    list<T> &operator=(list<T> other)
    {
      using std::swap;
      swap(this->mHeader, other.mHeader);
      swap(this->mSize, other.mSize);
      return *this;
    }

    ~list()
    {
      clear();
      delete mHeader;
    }

    //------------- capacity function -------------------
    bool empty() const { return mSize == 0; }

    size_t size() const { return mSize; }

    //----------------- iterator ---------------
    iterator begin() { return iterator(mHeader->next); }

    iterator end() { return iterator(mHeader); }

    iterator begin() const { return iterator(mHeader->next); }

    iterator end() const { return iterator(mHeader); }

    //----------------- access -----------------
    T &front() { return mHeader->next->data; }

    T &back() { return mHeader->prev->data; }

    const T &front() const { return mHeader->next->data; }

    const T &back() const { return mHeader->prev->data; }

    //----------------- modifier -------------
    void push_back(const T &element) { insert(end(), element); }

    void push_front(const T &element) { insert(begin(), element); }

    void pop_back() { erase(iterator(mHeader->prev)); }

    void pop_front() { erase(begin()); }

    // insert `element` just before `it`; returns an iterator to the new node
    iterator insert(iterator it, const T &element)
    {
      node *n = new node(element, it.ptr->prev, it.ptr);
      it.ptr->prev->next = n;
      it.ptr->prev = n;
      mSize++;
      return iterator(n);
    }

    // remove the node at `it`; returns an iterator to the node after it
    iterator erase(iterator it)
    {
      iterator tmp(it.ptr->next);
      it.ptr->prev->next = it.ptr->next;
      it.ptr->next->prev = it.ptr->prev;
      delete it.ptr;
      mSize--;
      return tmp;
    }

    void clear()
    {
      while (mSize > 0)
        erase(begin());
    }

    // Walks the list in BOTH directions, so a broken prev or next pointer
    // shows up as two lines that are not the reverse of each other.
    void print() const
    {
      std::cout << "Size = " << mSize << "\n";
      std::cout << "From FRONT to BACK: ";
      for (iterator it = begin(); it != end(); it++)
      {
        std::cout << *it << " ";
      }
      std::cout << std::endl
                << "From BACK to FRONT: ";
      iterator it = end();
      while (it != begin())
      {
        --it;
        std::cout << *it << " ";
      }
      std::cout << "\n";
    }

    // for student.h
    iterator find(const T &value) const;
  };

} // namespace CP

#endif
