#include <bits/stdc++.h>
using namespace std;

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(0);

    int n, m;
    long long k;
    cin >> n >> m >> k;

    vector<long long> v(n);

    for (int i = 0; i < n; i++)
    {
        cin >> v[i];
    }

    sort(v.begin(), v.end());

    for (int i = 0; i < m; i++)
    {
        long long p;
        cin >> p;

        auto l = lower_bound(v.begin(), v.end(), p - k);
        auto r = upper_bound(v.begin(), v.end(), p + k);

        cout << (r - l);

        if (i + 1 < m)
            cout << " ";
    }

    cout << '\n';

    return 0;
}
