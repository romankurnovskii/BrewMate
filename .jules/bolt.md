## 2024-05-24 - [Homebrew API Download Optimization]
**Learning:** Homebrew's JSON APIs (like formulae.json and cask.json) are extremely large (up to 30MB) and downloading them without compression causes unnecessary memory pressure and network delay.
**Action:** Always enable `Accept-Encoding: gzip` when fetching large APIs in `src/utils/fetchData.ts` to reduce payload size significantly (by ~85%).
