# Bolt's Journal

## 2024-05-15 - Array Filtering Optimization
**Learning:** For large datasets (like Pantry's ~100k `allApps`), avoiding inline closures/IIFEs inside `.filter()` loops and ordering early returns by condition speed (direct property checks > set lookups > string includes) prevents UI thread blocking and significantly improves filtering speed (from ~1000ms to ~450ms for 100k records).
**Action:** Move invariant transformations (like `searchTerm.toLowerCase()`) outside the loop, and use short-circuiting logic with the fastest checks first.
