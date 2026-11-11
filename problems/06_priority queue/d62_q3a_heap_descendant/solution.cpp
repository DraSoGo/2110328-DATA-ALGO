#include <bits/stdc++.h>
using namespace std;

int main()
{
    ios::sync_with_stdio(0);cin.tie(0);cout.tie(0);
    int n,a;
    cin >> n >> a;
    vector <int> V;
    V.push_back(a);
    int i = 0;
    while (V.back() < n)
    {
        int x = 2*V[i]+1;
        int y = 2*V[i]+2;
        if (x >= n)
        {
            break;
        }
        V.push_back(x);
        if (y >= n)
        {
            break;
        }
        V.push_back(y);
        i++;
    }
    cout << V.size() << "\n";
    for(auto k:V)
    {
        cout << k << " ";
    }
    return 0;
}