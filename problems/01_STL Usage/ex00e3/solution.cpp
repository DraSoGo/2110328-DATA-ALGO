#include <bits/stdc++.h>
using namespace std;

int main()
{
    ios_base::sync_with_stdio(false);
    cin.tie(0);

    int n;
    cin >> n;

    vector<bool> seen(n + 1, false);
    bool ok = true;

    for (int i = 0; i < n; i++)
    {
        int x;
        cin >> x;

        if (x < 1 || x > n)
        {
            ok = false;
        }
        else if (seen[x])
        {
            ok = false;
        }
        else
        {
            seen[x] = true;
        }
    }

    cout << (ok ? "YES" : "NO") << '\n';

    return 0;
}
