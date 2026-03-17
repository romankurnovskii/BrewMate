## 2025-05-24 - [Avoid Redundant String Conversions in Large Array Filters]
**Learning:** In the Homebrew GUI renderer, `allApps` contains thousands of items (~7000+). Inside the `filterApps` function, transforming the `searchTerm` to lower case inside the `.filter()` callback means doing the exact same lower-casing operation 7000+ times every single time a user types a letter.
**Action:** Always move invariant transformations (like `searchTerm.toLowerCase()`) outside of collection filter loops.
