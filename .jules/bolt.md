## 2026-04-06 - [Large Dataset Filtering Optimization]
**Learning:** Moving invariant string operations (like ) out of large  loops and caching computed lowercase fields on the data model significantly improves filtering speed and memory profile, avoiding massive garbage collection overhead.
**Action:** When filtering datasets with thousands of items on every keystroke, hoist all constant transformations outside the loop and dynamically cache expensive property evaluations directly onto the items.
## 2023-11-09 - [Large Dataset Filtering Optimization]
**Learning:** Moving invariant string operations (like `searchTerm.toLowerCase()`) out of large `.filter()` loops and caching computed lowercase fields on the data model significantly improves filtering speed and memory profile, avoiding massive garbage collection overhead.
**Action:** When filtering datasets with thousands of items on every keystroke, hoist all constant transformations outside the loop and dynamically cache expensive property evaluations directly onto the items.
