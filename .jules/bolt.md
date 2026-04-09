# Bolt Journal

## 2024-XX-XX - [Initial Setup]
**Learning:** Initial journal creation.
**Action:** Ready to track performance learnings.

## 2024-XX-XX - [Homebrew API Stream Optimization]
**Learning:** Homebrew API JSON files (`cask.json`, `formula.json`) are extremely large (30MB+ uncompressed). Fetching them with $O(n^2)$ string concatenation overhead (e.g., `data += chunk`) results in severe memory overhead and CPU blocking.
**Action:** Always fetch these APIs with HTTP compression headers (`Accept-Encoding: gzip, deflate, br`) and use `zlib` stream pipes to decompress on the fly. When building strings from streams, push Buffer chunks to an array and combine via `Buffer.concat(chunks).toString('utf8')` at the very end to prevent exponential memory allocations.

## 2024-XX-XX - [Filter App Performance]
**Learning:** Avoid redundant, invariant object transformation calls in `.filter()` functions that process large domain arrays (e.g., 3,000+ homebrew formulas).
**Action:** Always perform `.toLowerCase()` and other transformation mappings _outside_ of filtering iteration logic if the transformation output never changes per item.