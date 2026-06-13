const allApps = Array.from({ length: 100000 }, (_, i) => ({
  name: `App ${i}`,
  type: 'cask',
  _nameLower: `app ${i}`,
  _category: 'Utilities',
  _searchStr: `app ${i}\0Some description\0https://example.com`
}));

function filterApps(searchTerm, selectedType, selectedCategory) {
  const searchLower = searchTerm ? searchTerm.toLowerCase() : '';

  if (!searchLower && selectedType === 'All' && selectedCategory === 'All') {
    return allApps;
  }

  return allApps.filter((app) => {
    // ... logic
    return true;
  });
}

const start = performance.now();
filterApps('', 'All', 'All');
const end = performance.now();
console.log(`Fast path: ${end - start}ms`);

const start2 = performance.now();
filterApps('foo', 'All', 'All');
const end2 = performance.now();
console.log(`Normal path: ${end2 - start2}ms`);
