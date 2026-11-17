#ifndef _STUDENT_H_
#define _STUDENT_H_

// you can also include anything else here
#include <bits/stdc++.h>
using namespace std;

vector<size_t> count_value(const std::map<long long, int> &data, const std::vector<std::pair<int, int>> &queries)
{
  vector<int> V;
  vector<size_t> ANS;
  for (auto &x : data)
  {
    V.push_back(x.second);
  }
  sort(V.begin(), V.end());
  for (auto [l, r] : queries)
  {
    size_t idxl = lower_bound(V.begin(), V.end(), l) - V.begin();
    size_t idxr = upper_bound(V.begin(), V.end(), r) - V.begin();
    ANS.push_back(idxr - idxl);
  }
  return ANS;
}

#endif
