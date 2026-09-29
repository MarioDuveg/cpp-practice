#pragma once

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <deque>
#include <initializer_list>
#include <iostream>
#include <limits>
#include <numeric>
#include <queue>
#include <sstream>
#include <stack>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* n) : val(x), next(n) {}
};

static inline string ans(const string& v) { return v; }
static inline string ans(const char* v) { return string(v); }
static inline string ans(bool v) { return v ? "true" : "false"; }
static inline string ans(int v) { return to_string(v); }
static inline string ans(long v) { return to_string(v); }
static inline string ans(long long v) { return to_string(v); }
static inline string ans(unsigned int v) { return to_string(v); }
static inline string ans(unsigned long v) { return to_string(v); }
static inline string ans(unsigned long long v) { return to_string(v); }

static inline string ans(const vector<int>& v) {
    string out = "[";
    for (size_t i = 0; i < v.size(); ++i) {
        if (i) out += ",";
        out += to_string(v[i]);
    }
    out += "]";
    return out;
}

static inline ListNode* buildList(initializer_list<int> values) {
    ListNode dummy;
    ListNode* tail = &dummy;
    for (int x : values) {
        tail->next = new ListNode(x);
        tail = tail->next;
    }
    return dummy.next;
}

static inline ListNode* nodeAt(ListNode* head, int index) {
    while (head && index-- > 0) head = head->next;
    return head;
}

static inline ListNode* appendShared(ListNode* prefix, ListNode* shared) {
    if (!prefix) return shared;
    ListNode* p = prefix;
    while (p->next) p = p->next;
    p->next = shared;
    return prefix;
}

static inline ListNode* buildCycle(initializer_list<int> values, int pos) {
    ListNode* head = buildList(values);
    if (!head || pos < 0) return head;
    ListNode* join = nodeAt(head, pos);
    ListNode* tail = head;
    while (tail->next) tail = tail->next;
    tail->next = join;
    return head;
}

static inline string ansList(ListNode* head) {
    string out = "[";
    unordered_set<ListNode*> seen;
    int count = 0;
    while (head) {
        if (seen.count(head) || count++ > 10000) return "[cycle]";
        seen.insert(head);
        if (out.size() > 1) out += ",";
        out += to_string(head->val);
        head = head->next;
    }
    out += "]";
    return out;
}
