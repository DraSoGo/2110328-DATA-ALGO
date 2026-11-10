#include <bits/stdc++.h>
using namespace std;
int main()
{
    ios::sync_with_stdio(0);cin.tie(0);cout.tie(0);
    int n,k;
    cin >> n >> k;
    priority_queue <string> PQ;
    string s;
    vector <int> V;
    for (int i = 0; i < n; i++)
    {
        cin >> s;
        PQ.push(s);
    }
    int co = 1;
    while (!PQ.empty())
    {
        string nw = PQ.top();
        PQ.pop();
        if (PQ.empty())
        {
            break;
        }
        string nxt = PQ.top();
        // cout << nw << " " << nxt << "\n";
        if (nw != nxt)
        {
            V.push_back(co);
            co = 1;
        }
        else
        {
            co++;
        }
        // cout << co << "\n";
    }
    V.push_back(co);
    sort(V.begin(),V.end());
    // for (int i = 0; i < V.size(); i++)
    // {
    //     cout << V[i] << " ";
    // }
    // cout << "\n";
    cout << V[max(0,int(V.size()-k))];
    return 0;
}