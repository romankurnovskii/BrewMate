import { performance } from 'perf_hooks';

interface App {
  name: string;
  type: string;
  _nameLower?: string;
  _category?: string;
  _searchStr?: string;
}

const allApps: App[] = [];
for (let i = 0; i < 100000; i++) {
  allApps.push({
    name: `App${i}`,
    type: i % 2 === 0 ? 'cask' : 'formula',
    _nameLower: `app${i}`,
    _category: i % 3 === 0 ? 'Utility' : 'Development',
    _searchStr: `app${i} some description`,
  });
}

const selectedType = 'cask';
const selectedCategory = 'Utility';
const searchLower = 'app1';

function filterWithArrayFilter() {
  const start = performance.now();
  let result = allApps.filter((app) => {
    if (selectedType !== 'All' && app.type !== selectedType) {
      return false;
    }
    if (selectedCategory !== 'All') {
      const category = app._category;
      if (category !== selectedCategory) return false;
    }
    if (searchLower) {
      if (app._searchStr !== undefined) {
        return app._searchStr.indexOf(searchLower) !== -1;
      }
      return false;
    }
    return true;
  });
  const end = performance.now();
  console.log(`Array.filter: ${end - start}ms (found ${result.length})`);
}

function filterWithForLoop() {
  const start = performance.now();
  let result = [];
  for (let i = 0; i < allApps.length; i++) {
    const app = allApps[i];
    if (selectedType !== 'All' && app.type !== selectedType) {
      continue;
    }
    if (selectedCategory !== 'All') {
      const category = app._category;
      if (category !== selectedCategory) continue;
    }
    if (searchLower) {
      if (app._searchStr !== undefined) {
        if (app._searchStr.indexOf(searchLower) === -1) continue;
      } else {
        continue;
      }
    }
    result.push(app);
  }
  const end = performance.now();
  console.log(`For Loop: ${end - start}ms (found ${result.length})`);
}

filterWithArrayFilter();
filterWithForLoop();

filterWithArrayFilter();
filterWithForLoop();
