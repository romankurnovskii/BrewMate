## 2024-05-24 - Array Filtering Optimization for Large Datasets
**Learning:** In Electron renderer environments with large datasets (~100k items), using inline closures (IIFEs) and repeating invariant calculations (like `toLowerCase()`) inside `.filter()` loops causes significant UI thread blocking during rapid keystroke events.
**Action:** Move invariant transformations outside loops, order loop conditions from fastest (property checks) to slowest (string matching), and lazily memoize expensive computed properties directly onto the item objects to avoid redundant string operations.
