#include <bits/stdc++.h>
using namespace std;

int main()
{
    ios_base::sync_with_stdio(0);
    cin.tie(0);
    cout.tie(0);
    const int D = 200001;
    int n, m, st;
    cin >> n >> m >> st;

    vector<int> C(D, 0);
    for (int i = 0; i < n; i++)
    {
        int a, s;
        cin >> a >> s;
        C[a] = s;
    }

    vector<long long> sum(D);
    int rate = st;
    for (int d = 0; d < D; d++)
    {
        if (C[d])
        {
            rate = C[d];
        }
        sum[d] = (d ? sum[d - 1] : 0) + rate;
    }

    for (int i = 0; i < m; i++)
    {
        long long P;
        int x;
        cin >> P >> x;
        int d = lower_bound(sum.begin(), sum.end(), P) - sum.begin();
        if (d > x)
        {
            d = lower_bound(sum.begin(), sum.end(), P + sum[x]) - sum.begin();
        }
        cout << d << (i + 1 < m ? ' ' : '\n');
    }
    return 0;
}
