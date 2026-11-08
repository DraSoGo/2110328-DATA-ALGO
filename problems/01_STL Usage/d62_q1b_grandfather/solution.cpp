#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(0);

    int n, m;
    cin >> n >> m;

    unordered_map<long long, long long> parent;
    parent.reserve(n * 2);

    for (int i = 0; i < n; i++) {
        long long f, s;
        cin >> f >> s;
        parent[s] = f;
    }

    for (int i = 0; i < m; i++) {
        long long a, b;
        cin >> a >> b;

        if (a == b || !parent.count(a) || !parent.count(b)) {
            cout << "NO\n";
            continue;
        }

        long long pa = parent[a];
        long long pb = parent[b];

        if (!parent.count(pa) || !parent.count(pb)) {
            cout << "NO\n";
            continue;
        }

        cout << (parent[pa] == parent[pb] ? "YES\n" : "NO\n");
    }

    return 0;
}
