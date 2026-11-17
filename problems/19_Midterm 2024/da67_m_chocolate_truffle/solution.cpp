#pragma GCC optimize("O3,unroll-loops")
#include <bits/stdc++.h>
using namespace std;
int main()
{
    ios::sync_with_stdio(0);
    cin.tie(0);
    cout.tie(0);
    int r, c, k, q;
    cin >> r >> c >> k;
    vector<pair<long long, long long>> V;
    for (int i = 0; i < k; i++)
    {
        long long x, y;
        cin >> x >> y;
        V.push_back({x, y});
    }
    cin >> q;
    sort(V.begin(), V.end());
    for (int i = 0; i < q; i++)
    {
        long long x, y;
        cin >> x >> y;
        pair<long long, long long> t = {x, y};
        int idx = (lower_bound(V.begin(), V.end(), t) - V.begin()) % V.size();
        long long ans;
        t = V[idx];
        if (x == t.first && y <= t.second)
        {
            ans = t.second - y;
        }
        else if (x < t.first)
        {
            ans = (c - y) + ((t.first - x - 1) * c) + (t.second);
        }
        else
        {
            ans = (c - y) + ((r - x) * c) + ((t.first-1)*c) + t.second;
        }
        cout << ans << "\n";
    }
    return 0;
}