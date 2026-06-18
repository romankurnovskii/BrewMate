1. **Add `categoryColorMap` to `src/renderer/renderer.ts`**
   - Declare a `let categoryColorMap = new Map<string, string>();` near the top of the file, alongside `categoryDictionary`.
2. **Populate `categoryColorMap` during category data load**
   - In `init()`, when `ipcRenderer.getCategories()` resolves successfully, iterate over `Object.values(data.categories)` and populate the map: `categoryColorMap.set(c.label, c.color)`.
3. **Refactor `getCategoryColor` in `renderDashboardDonutChart`**
   - Modify the `getCategoryColor` function to use O(1) Map lookup instead of O(N) array iteration with `Object.values().find()`.
   - Before: `const entry = Object.values(categoryDictionary!.categories).find((c) => c.label === label); return entry ? entry.color : 'hsl(200, 10%, 50%)';`
   - After: `return categoryColorMap.get(label) || 'hsl(200, 10%, 50%)';`
4. **Append Journal Entry**
   - Append a critical learning to `.jules/bolt.md` explaining why `Object.values().find()` is bad for rendering and how using a precomputed `Map` improves performance.
5. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
6. **Submit PR**
   - Submit the PR with the required performance format.
