#pragma GCC optimize("O3,unroll-loops")
#include <bits/stdc++.h>
using namespace std;
int main()
{
    ios::sync_with_stdio(0);cin.tie(0);cout.tie(0);
    int n;
    cin >> n;
    map <int,int> ANS;
    for (int i = 0; i < n; i++)
    {
        int x;
        cin >> x;
        if (x == 2)
        {
            cout << ANS.size() << "\n";
            continue;
        }
        int l,r;
        cin >> l >> r;
        auto it = ANS.upper_bound(l);
        if (it != ANS.begin())
        {
            auto p = prev(it);
            if (p->second >= l-1)
            {
                it = p;
            }
        }
        while (it != ANS.end() && it->first <= r+1)
        {
            l = min(l,it->first);
            r = max(r,it->second);
            it = ANS.erase(it);
        }
        ANS[l] = r;
    }
    return 0;
}