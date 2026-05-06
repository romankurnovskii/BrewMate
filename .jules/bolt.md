## 2024-05-19 - [Frontend Performance: Large Dataset Filtering Optimization]
**Learning:** When filtering large datasets (~100k apps) on the frontend during keystroke input, creating inline closures (like IIFEs) and performing redundant string transformations (`.toLowerCase()`) inside `.filter()` iterations causes significant UI thread blocking.
**Action:** Move invariant logic outside the loop, order conditions for early returns, and memoize computationally expensive fields (`_category`, `_nameLower`, etc.) directly onto the data objects immediately when the data is received via IPC.
