## 2024-04-15 - Data Mutation for Caching

**Learning:** For large datasets (>100k items) loaded and filtered on the main thread or renderer UI thread, invariant transformations like `toLowerCase()` inside tight `.filter()` and categorization loops create thousands of unnecessary string allocations during search keystrokes, leading to UI jitter/blocking.
**Action:** When filtering across massive data arrays repeatedly, eagerly add non-enumerable or hidden caching properties (e.g. `_nameLower ??= name.toLowerCase()`, `_category`) directly onto the data objects inside the filter evaluation. Also, move simple global derivations (like formatting `searchTerm`) entirely outside the loop, and order early returns from fastest (strict equality) to slowest (regex/substring inclusion).
