const { performance } = require('perf_hooks');

const allApps = [];
for (let i = 0; i < 100000; i++) {
  allApps.push({
    name: `App${i}`,
    description: `Description of App${i} which is very useful and nice`,
    homepage: `https://app${i}.com`,
    type: i % 2 === 0 ? 'cask' : 'formula'
  });
}

let selectedType = 'All';
let selectedCategory = 'All';
let searchTerm = 'App99999';
const installedApps = new Set(['App1', 'App2']);

function getCategoryForApp(app) {
  return 'Developer Tools';
}

function oldFilter() {
  return allApps.filter((app) => {
    const matchesType = selectedType === 'All' || app.type === selectedType;

    let matchesCategory = true;
    if (selectedCategory === 'Installed') {
      matchesCategory = installedApps.has(app.name);
    } else if (selectedCategory !== 'All') {
      matchesCategory = getCategoryForApp(app) === selectedCategory;
    }

    const matchesSearch =
      !searchTerm ||
      (() => {
        const searchLower = searchTerm.toLowerCase();
        const name = (app.name || '').toLowerCase();
        const desc = (app.description || '').toLowerCase();
        const homepage = (app.homepage || '').toLowerCase();
        return (
          name.includes(searchLower) ||
          desc.includes(searchLower) ||
          homepage.includes(searchLower)
        );
      })();

    return matchesType && matchesCategory && matchesSearch;
  });
}

function newFilter() {
  if (!searchTerm && selectedType === 'All' && selectedCategory === 'All') {
    return allApps;
  }

  const searchLower = (searchTerm || '').toLowerCase();

  return allApps.filter((app) => {
    // 1. Direct property check (fastest)
    if (selectedType !== 'All' && app.type !== selectedType) {
      return false;
    }

    // 2. Set lookup / Function call (medium)
    if (selectedCategory === 'Installed') {
      if (!installedApps.has(app.name)) return false;
    } else if (selectedCategory !== 'All') {
      // Memoize the calculated category onto the item object to prevent UI thread blocking
      if (!app._category) app._category = getCategoryForApp(app);
      if (app._category !== selectedCategory) return false;
    }

    // 3. String manipulation and includes (slowest)
    if (searchLower) {
      const name = (app.name || '').toLowerCase();
      if (name.includes(searchLower)) return true;

      const desc = (app.description || '').toLowerCase();
      if (desc.includes(searchLower)) return true;

      const homepage = (app.homepage || '').toLowerCase();
      if (homepage.includes(searchLower)) return true;

      return false;
    }

    return true;
  });
}

// Warm up
for (let i = 0; i < 10; i++) { oldFilter(); newFilter(); }

const startOld = performance.now();
for (let i = 0; i < 50; i++) oldFilter();
const endOld = performance.now();
console.log(`Old Filter (50x): ${endOld - startOld}ms`);

const startNew = performance.now();
for (let i = 0; i < 50; i++) newFilter();
const endNew = performance.now();
console.log(`New Filter (50x): ${endNew - startNew}ms`);
