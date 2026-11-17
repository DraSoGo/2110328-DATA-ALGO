void splitList(list<T> &list1, list<T> &list2)
{
    size_t sz2 = size() / 2, sz1 = size() - sz2;
    if (sz1 == 0)
    {
        return;
    }

    node *f1 = mHeader->next;
    node *l1 = f1;
    for (size_t i = 1; i < sz1; i++)
    {
        l1 = l1->next;
    }
    node *f2 = l1->next;
    node *l2 = mHeader->prev;

    node *t1 = list1.mHeader->prev;
    t1->next = f1;
    f1->prev = t1;
    l1->next = list1.mHeader;
    list1.mHeader->prev = l1;
    list1.mSize += sz1;

    if (sz2 > 0)
    {
        node *t2 = list2.mHeader->prev;
        t2->next = f2;
        f2->prev = t2;
        l2->next = list2.mHeader;
        list2.mHeader->prev = l2;
        list2.mSize += sz2;
    }

    mHeader->next = mHeader;
    mHeader->prev = mHeader;
    mSize = 0;
}