// Transcribed from the course slides 18_Hash_Table.pdf
#ifndef _CP_UNORDERED_MAP_INCLUDED_
#define _CP_UNORDERED_MAP_INCLUDED_

#include <algorithm>
#include <functional>
#include <utility>
#include <vector>

namespace CP {

// table sizes are primes: the slide shows 256 of them (2ul, 3ul, 5ul, ...)
const size_t        N_PRIMES      = 36;
const unsigned long PRIMES[N_PRIMES] = {
  2ul, 3ul, 5ul, 7ul, 11ul, 13ul, 17ul, 19ul, 23ul, 29ul,
  53ul, 97ul, 193ul, 389ul, 769ul, 1543ul, 3079ul, 6151ul, 12289ul, 24593ul,
  49157ul, 98317ul, 196613ul, 393241ul, 786433ul, 1572869ul, 3145739ul,
  6291469ul, 12582917ul, 25165843ul, 50331653ul, 100663319ul, 201326611ul,
  402653189ul, 805306457ul, 1610612741ul
};

template <typename KeyT,
          typename MappedT,
          typename HasherT = std::hash<KeyT>,
          typename EqualT = std::equal_to<KeyT> >
class unordered_map {
  protected:
    typedef std::pair<KeyT,MappedT> ValueT;
    typedef std::vector<ValueT>      BucketT;
    typedef typename std::vector<ValueT>::iterator  ValueIterator;
    typedef typename std::vector<BucketT>::iterator BucketIterator;

    std::vector<BucketT> mBuckets;
    size_t               mSize;
    HasherT              mHasher;
    EqualT               mEqual;
    float                mMaxLoadFactor;

    class hashtable_iterator {
      protected:
        ValueIterator  mCurValueItr;
        BucketIterator mCurBucketItr;
        BucketIterator mEndBucketItr;

        void to_next_data( ) {
          while ( mCurBucketItr != mEndBucketItr &&
                  mCurValueItr == mCurBucketItr->end() ) {
            mCurBucketItr++;
            if (mCurBucketItr == mEndBucketItr) break;
            mCurValueItr = mCurBucketItr->begin();
          }
        }

      public:
        typedef ValueT & reference;
        typedef ValueT * pointer;

        hashtable_iterator() { }

        hashtable_iterator(ValueIterator valueItr,
                           BucketIterator bucketItr,
                           BucketIterator endBucketItr) :
          mCurValueItr(valueItr),
          mCurBucketItr(bucketItr),
          mEndBucketItr(endBucketItr)
        {
          to_next_data();
        }

        hashtable_iterator& operator++() {   // ++it
          mCurValueItr++;
          to_next_data();
          return (*this);
        }

        hashtable_iterator operator++(int) { // it++
          hashtable_iterator tmp(*this);
          operator++();
          return tmp;
        }

        reference operator*() {
          return *mCurValueItr;
        }

        pointer operator->() {
          return &(*mCurValueItr);
        }

        bool operator==(const hashtable_iterator &other) {
          return mCurValueItr == other.mCurValueItr;
        }

        bool operator!=(const hashtable_iterator &other) {
          return mCurValueItr != other.mCurValueItr;
        }
    };

    size_t hash_to_bucket(const KeyT& key) {
      return mHasher(key) % mBuckets.size();
    }

    ValueIterator
    find_in_bucket(BucketT& b, const KeyT& key) {
      for(ValueIterator it = b.begin(); it != b.end(); it++){
        if (mEqual(it->first, key)) return it;
      }
      return b.end();
    }

    ValueIterator insert_to_bucket(const ValueT& val, size_t& bi) {
      if (load_factor() > max_load_factor()) {
        rehash(2*bucket_count());
        bi = hash_to_bucket(val.first);
      }
      ++mSize;
      return mBuckets[bi].insert(mBuckets[bi].end(), val);
    }

  public:
    typedef hashtable_iterator iterator;

    //-------------- constructor & copy operator ----------

    // default constructor
    unordered_map() :
      mBuckets( std::vector<BucketT>(11) ), mSize(0),
      mHasher( HasherT() ), mEqual( EqualT() ),
      mMaxLoadFactor(1.0)
    { }

    // copy constructor
    unordered_map(const
      unordered_map<KeyT,MappedT,HasherT,EqualT> & other) :
      mBuckets(other.mBuckets), mSize(other.mSize),
      mHasher(other.mHasher), mEqual(other.mEqual),
      mMaxLoadFactor(other.mMaxLoadFactor)
    { }

    // copy assignment operator
    unordered_map<KeyT,MappedT,HasherT,EqualT>&
      operator=(unordered_map<KeyT,MappedT,HasherT,EqualT>
                other) {
      using std::swap;
      swap(this->mBuckets,       other.mBuckets);
      swap(this->mSize,          other.mSize   );
      swap(this->mHasher,        other.mHasher );
      swap(this->mEqual,         other.mEqual );
      swap(this->mMaxLoadFactor, other.mMaxLoadFactor);
      return *this;
    }

    ~unordered_map() {
      clear();
    }

    //------------- capacity function -------------------
    bool empty() { return mSize == 0; }

    size_t size() { return mSize; }

    size_t bucket_count() {
      return mBuckets.size();
    }

    size_t bucket_size(size_t n) {
      return mBuckets[n].size();
    }

    float load_factor() {
      return (float)mSize/mBuckets.size();
    }

    float max_load_factor() {
      return mMaxLoadFactor;
    }

    void max_load_factor(float z) {
      mMaxLoadFactor = z;
      rehash(bucket_count());
    }

    //----------------- iterator ---------------
    iterator begin() {
      return iterator( mBuckets.begin()->begin(),
                       mBuckets.begin(),
                       mBuckets.end() );
    }

    iterator end() {
      return iterator( mBuckets[mBuckets.size()-1].end(),
                       mBuckets.end(),
                       mBuckets.end() );
    }

    //----------------- access -----------------
    MappedT& operator[](const KeyT& key) {
      size_t        bi = hash_to_bucket(key);
      ValueIterator it = find_in_bucket(mBuckets[bi],key);

      if (it == mBuckets[bi].end()) {
        it = insert_to_bucket(std::make_pair(key, MappedT()),bi);
      }

      return it->second;
    }

    //----------------- modifier -------------
    void clear() {
      for ( auto& bucket : mBuckets ) {
        bucket.clear();
      }
      mSize = 0;
    }

    void rehash(size_t m) {
      if ( m <= mBuckets.size() &&
           load_factor() <= max_load_factor() ) return;
      m = std::max(m, (size_t)(0.5+mSize/mMaxLoadFactor));
      m = *std::lower_bound(PRIMES, PRIMES+N_PRIMES, m);
      std::vector<ValueT> tmp;
      for (auto& val : *this) tmp.push_back(val);
      this->clear();
      mBuckets.resize(m);
      for (auto& val : tmp ) this->insert(val);
    }

    size_t erase(const KeyT & key) {
      size_t        bi = hash_to_bucket(key);
      ValueIterator it = find_in_bucket(mBuckets[bi], key);
      if (it == mBuckets[bi].end()) {
        return 0; // erase 0 element
      } else {
        mBuckets[bi].erase(it);
        mSize--;
        return 1; // erase 1 element
      }
    }

    std::pair<iterator,bool> insert(const ValueT& val) {
      std::pair<iterator,bool> result;
      const KeyT& key = val.first;
      size_t        bi = hash_to_bucket(key);
      ValueIterator it = find_in_bucket(mBuckets[bi], key);
      result.second = false;
      if (it == mBuckets[bi].end()) {
        it = insert_to_bucket(val, bi);
        result.second = true;
      }
      result.first = iterator(it,
                              mBuckets.begin()+bi,
                              mBuckets.end());
      return result;
    }
};

}

#endif
