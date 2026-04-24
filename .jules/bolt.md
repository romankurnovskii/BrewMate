## 2024-04-24 - Search Indexing Allocation Overhead
**Learning:** For Electron apps with `nodeIntegration: true` processing large datasets (~100k records), repetitive allocations of short-lived strings (e.g. `toLowerCase()`) during rendering frames triggers synchronous GC pauses that visibly stutter keystrokes. Caching derived search fields directly onto the data structures drastically reduces allocation pressure.
**Action:** Always favor lazy-evaluation memoization onto parent objects over repetitive transformations inside `.filter()` or `.map()` loops.
