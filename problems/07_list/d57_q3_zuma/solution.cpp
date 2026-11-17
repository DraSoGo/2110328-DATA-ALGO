#pragma GCC optimize("O3,unroll-loops")
#include <bits/stdc++.h>
using namespace std;
int main()
{
    ios::sync_with_stdio(0);cin.tie(0);cout.tie(0);
    int n,p,v;
    cin >> n >> p >> v;
    int A[n+3];
    A[0] = -1;
    A[n+2] = -2;
    p++;
    for (int i = 1; i < n+2; i++)
    {
        if (i == p)
        {
            A[i] = v;
            continue;
        }
        cin >> A[i];
    }
    // for (int i = 1; i <= n+1; i++)
    // {
    //     cout << A[i] << " ";
    // }
    // cout << "\n";
    int l = p,r = p,c = v,sum = 0,s,e;
    while (A[l] == A[r])
    {
        s = l;
        e = r;
        while (A[l] == c)
        {
            l--;
        }
        while (A[r] == c)
        {
            r++;
        }
        int now = r-l-1-sum;
        if (now < 3)
        {
            l = s;
            r = e;
            break;
        }
        sum += now;
        c = A[l];
    }

    for (int i = 1; i <= l; i++)
    {
        cout << A[i] << " ";
    }
    for (int i = r == l?r+1:r; i <= n+1; i++)
    {
        cout << A[i] << " ";
    }
    return 0;
}