#include <bits/stdc++.h>
using namespace std;

struct manga
{
    int y,m;
    bool operator < (const manga & a)const
    {
        if (y == a.y)
        {
            return m < a.m;
        }
        return y < a.y;
    }
};


int main()
{
    ios_base::sync_with_stdio(0);cin.tie(0);cout.tie(0);
    int n,m;
    cin >> n >> m;
    manga A[n];
    for (int i = 0; i < n; i++)
    {
        cin >> A[i].y >> A[i].m;
    }
    sort(A,A+n);
    for (int i = 0; i < m; i++)
    {
        int y,m;
        cin >> y >> m;
        manga t = {y,m};
        auto k = lower_bound(A,A+n,t) - A;
        // cout << y << " " << m << " / " << A[0].y << " " << A[0].m << "\n";
        if (y == A[k].y && m == A[k].m)
        {
            cout << 0 << " " << 0;
        }
        else if (y < A[0].y || (y == A[0].y && m < A[0].m))
        {
            cout << -1 << " " << -1;
        }
        else
        {
            k--;
            cout << A[k].y << " " << A[k].m;
        }
        
        cout << " ";
    }
    return 0;
}
