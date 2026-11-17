#pragma GCC optimize("O3,unroll-loops")
#include <bits/stdc++.h>
using namespace std;
int main()
{
    ios::sync_with_stdio(0);cin.tie(0);cout.tie(0);
    int n,m;
    cin >> n >> m;
    queue <int> Q,ANS;
    Q.push(m);
    for (int i = 0; i < n; i++)
    {
        if (!Q.empty() && Q.front() == i)
        {
            Q.push(2*i+1);
            Q.push(2*i+2);
            Q.pop();
            continue;
        }
        ANS.push(i);
    }
    cout << ANS.size() << "\n";
    while (!ANS.empty())
    {
        cout << ANS.front() << " ";
        ANS.pop();
    }
    return 0;
}