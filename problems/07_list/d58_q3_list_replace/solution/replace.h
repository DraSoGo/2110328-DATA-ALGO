void replace(const T& x, list<T>& y) {
  iterator idx = begin();
  while (idx != end())
  {
    if (*idx == x)
    {
      for (iterator i = y.begin(); i != y.end(); i++)
      {
        insert(idx,*i);
      }
      idx = erase(idx);
    }
    else
    {
      idx++;
    }
  }
  
}
