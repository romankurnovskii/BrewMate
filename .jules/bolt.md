## 2024-05-24 - [Avoid `O(n^2)` loops when caching large datasets]
**Learning:** `fetchJSON` utility in `src/utils/fetchData.ts` stream processing does string concatenation `data += chunk`, which allocates a new string on each chunk. Given `data` is very large json strings (30+ MB), this turns into `O(N^2)` memory reallocations and slows down processing.
**Action:** Accumulate `Buffer` chunks in an array and combine them using `Buffer.concat(chunks).toString()` in the `end` event to avoid $O(N^2)$ complexity and memory allocation overhead.
