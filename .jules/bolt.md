
## 2024-05-18 - Prevent UI thread blocking during keystroke searches
**Learning:** For large datasets (like the app's ~100k `allApps`), avoiding inline closures and redundant string operations inside `.filter()` loops is crucial. Because filtering happens on every keystroke, repeated `toLowerCase()` operations and expensive category calculations block the Electron renderer main thread, leading to input lag.
**Action:** Lazily cache computed properties (`_category`, `_nameLower`, `_descLower`, `_homeLower`) directly on the data objects during the first render/filter cycle, and move invariant transformations (like the search term string manipulation) outside the loop.
