## 2024-05-18 - Optimized filter loop for 100k items array
**Learning:** In Electron applications rendering large sets of data (~100k items from Homebrew API), executing string transformations like `.toLowerCase()` and instantiating inline closures or IIFEs inside `.filter()` heavily blocks the main thread.
**Action:** When filtering massive datasets, always precompute and attach invariant transformations (`toLowerCase()`, calculated categories) to the object fields at ingestion time. Within the filtering loop, declare invariants (like `searchTerm.toLowerCase()`) outside the loop, avoid creating temporary closures, and use early returns to shortcut evaluations as quickly as possible.
## 2024-05-18 - Optimized fetchData with zlib compression
**Learning:** For Electron apps fetching large JSON payloads (like 100k items from the Homebrew API), not requesting compressed responses and using string concatenation (`+=`) on the `data` event blocks the network/main thread heavily.
**Action:** When fetching large data, request compressed payloads using `Accept-Encoding: gzip, deflate, br` headers. Read response `headers['content-encoding']` and pipe through `zlib` for decompression. In streams, accumulate buffers in an array and use `Buffer.concat(chunks).toString('utf8')` inside the `end` event to prevent O(N^2) memory and time overhead while avoiding chunk boundary multi-byte character issues.

## 2024-05-24 - DOM and String Optimization
**Learning:** Using `document.createElement('div')` for HTML escaping and `innerHTML +=` for appending content causes significant performance degradation due to memory reallocation and O(N^2) DOM serialization overhead during high-frequency updates (like terminal output or virtual scrolling).
**Action:** Always use a hoisted Regex replacement map for `escapeHtml` and `insertAdjacentHTML('beforeend', ...)` instead of `innerHTML +=`.
## 2024-05-24 - Async Cache I/O
**Learning:** For Electron apps handling large JSON payloads (like 100k items from the Homebrew API), using synchronous file system operations (`fs.readFileSync` and `fs.writeFileSync`) blocks the main thread.
**Action:** When performing file I/O for large data, always use asynchronous file system methods (`fs.promises`) to avoid blocking the event loop and maintain UI responsiveness.
## 2026-06-05 - Optimized application lookups with O(1) Maps
**Learning:** When cross-referencing subsets (like `installedApps`) against massive datasets (like `allApps` ~100k items) in the renderer, using nested array scans like `.find()` causes severe UI blocking due to O(N) complexity per lookup.
**Action:** Precompute and maintain a `Map<string, App>` alongside the main data array to enable O(1) property lookups, eliminating redundant array iterations.
## 2024-05-18 - Async Testing with Promise.all
**Learning:** In Jest, when refactoring sequential independent async operations to run concurrently via `Promise.all([func1(), func2()])`, chained `mockResolvedValueOnce` setups remain valid without modification because the functions within the array are instantiated synchronously in order.
**Action:** When migrating independent await statements to `Promise.all`, rely on existing sequential mocks instead of rewriting tests with complex mock orchestration.

## 2024-10-24 - [Optimizing Application Category Fallback Resolution]
**Learning:** For extremely large data lists (like the ~100k Homebrew apps), calculating fallbacks inside an inline loop for each app blocks the main thread noticeably because `Object.values(categoryDictionary.categories)` recalculates the array on every single item.
**Action:** Always pre-compile constants arrays, like categories with keywords, outside of loop bodies and avoid Object.keys / Object.values in tight loops executing on high volumes of records.
<<<<<<< HEAD
## 2024-10-24 - [Optimizing Application Category Color Lookups]
**Learning:** Using `Object.values().find()` inside a loop for rendering UI elements reallocates arrays and incurs O(N) lookup costs. In `renderDashboardDonutChart`, this was recalculating colors for every single donut chart segment unnecessarily.
**Action:** Precompute and maintain a `Map` (like `categoryColorMap`) during data ingestion to enable O(1) lookups and eliminate redundant allocations during renders.
## 2024-03-24 - [String Optimization]
**Learning:** V8 engine optimizes `String.indexOf(str) !== -1` significantly better than `String.includes(str)` in tight loops. Additionally, for repetitive HTML escaping, using `String.replace` with a dictionary object creates measurable garbage collection overhead; replacing it with a regex fast-path (`/[&<>"']/.exec()`) and a manual `charCodeAt` string-building loop doubles performance.
**Action:** Default to `indexOf` instead of `includes` when filtering massive arrays (~100k items) on the frontend. Avoid regex `replace` maps for high-frequency utility functions (like `escapeHtml` during virtual scrolling); favor char-code iteration.

## 2026-06-20 - Optimized subset filtering using Set iteration
**Learning:** When filtering a massive dataset (~100k items) down to a known subset (like installed apps), iterating through the entire massive array and checking `subset.has(item.name)` is extremely slow ($O(N)$).
**Action:** Instead of filtering the massive array, iterate through the smaller subset (`installedApps` Set) and pull the complete metadata directly from a precomputed $O(1)$ Map (`allAppsMap`), reducing time complexity to $O(K)$.
=======
## 2024-11-08 - Optimized category color lookup with O(1) Map
**Learning:** Using `Object.values().find()` inside a rendering loop reallocates arrays and incurs O(N) lookup costs, causing unnecessary overhead during frequent UI updates like chart rendering.
**Action:** Precompute and maintain a `Map<string, string>` (e.g., `categoryColorMap`) during initial data ingestion to enable O(1) lookups and eliminate redundant allocations during render.
>>>>>>> 190b8d5 (fix(renderer): eliminate innerHTML injection vulnerabilities)
## 2024-11-20 - Optimized array filtering to native for loops
**Learning:** Using `.filter()` with an inline callback function on massive datasets (~100k items) in V8 carries significant overhead due to callback function allocation and iterator execution.
**Action:** Replace `.filter()` and inline `.map()` combinations with native `for` loops (e.g. `for (let i = 0; i < len; i++)`) and `.push()` for extremely large arrays. Use `continue` inside the loop for early returns instead of returning false. This pattern eliminates callback closures and nearly doubles iteration performance.
