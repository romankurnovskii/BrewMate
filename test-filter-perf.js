const allApps = Array.from({ length: 100000 }, (_, i) => ({
  name: `App ${i}`,
  type: 'cask',
  _nameLower: `app ${i}`,
  _category: 'Utilities',
  _searchStr: `app ${i}\0Some description\0https://example.com`
}));

const start1 = performance.now();
const filteredApps1 = allApps.filter(() => true);
const end1 = performance.now();

console.log(`Filter all: ${end1 - start1}ms`);

const start2 = performance.now();
const filteredApps2 = allApps;
const end2 = performance.now();
console.log(`Direct assignment: ${end2 - start2}ms`);
