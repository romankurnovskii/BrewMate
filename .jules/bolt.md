## 2024-03-24 - [Avoid re-calculating searchTerm.toLowerCase() on every item inside filterApps]
**Learning:** `searchTerm.toLowerCase()` was being recalculated for every single app in the huge `allApps` array. Moving this out of the filter callback saves N string allocations and transformations, where N is the total number of Homebrew apps (which is huge!).
**Action:** When filtering over massive collections, always hoist invariant operations (like `searchTerm.toLowerCase()`) outside the iterator function.
