#include <iostream>
#include <vector>
#include "priority_queue.h"
#include "student.h"

int main() {
  CP::priority_queue<int> pq;
  int n;
  std::cin >> n;
  for (int i=0;i<n;i++) {
    int a;
    std::cin >> a;
    pq.push(a);
  }
  std::vector<int> ans = pq.unordered_index();
  if (ans.size()) for (auto &e : ans) std::cout << e << " ";
  else std::cout << "None";
  std::cout << "\n";
  return 0;
}
