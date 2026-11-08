#include <iostream>
#include "vector.h"
#include "student.h"

int main() {
    int n;
    CP::vector<int> v;
    std::cin >> n;
    for (int i= 0;i < n;i++) {
        int a;
        std::cin >> a;
        v.push_back(a);
    }
    int l,r;
    std::cin>>l>>r;
    v.aggregate(l,r);
    for(int i = 0 ; i<v.size(); i++){
        std::cout<<v[i]<<' ';
    }
}
