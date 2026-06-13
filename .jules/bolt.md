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
## 2024-06-11 - Fast-Path O(1) Array Assignment for Unfiltered Datasets
**Learning:** For massive datasets (~100k items in `allApps`), executing `Array.prototype.filter()` is an expensive $O(N)$ operation that blocks the main thread, even when all items are returned (e.g. no active filters).
**Action:** When a filter configuration is functionally a no-op (e.g., `selectedType === 'All'`, `selectedCategory === 'All'`, empty search), directly assign the source array reference (`filteredApps = allApps`) to achieve an $O(1)$ fast-path execution.
