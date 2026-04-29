import { performance } from 'perf_hooks';

interface App {
  name: string;
  description: string;
  homepage: string;
  version: string;
  type: 'cask' | 'formula';
  _category?: string;
  _nameLower?: string;
  _descLower?: string;
  _homeLower?: string;
}

const CATEGORIES = ['Developer Tools', 'Photo/Video', 'Graphic/Design', 'Music', 'Productivity', 'Social', 'Business', 'Games', 'Utilities', 'Other'];

function getCategoryForApp(app: App): string {
  const desc = (app.description || '').toLowerCase();
  const name = (app.name || '').toLowerCase();
  const text = desc + ' ' + name;

  if (text.includes('developer') || text.includes('code') || text.includes('git') || text.includes('terminal')) return 'Developer Tools';
  if (text.includes('photo') || text.includes('video') || text.includes('image') || text.includes('media')) return 'Photo/Video';
  if (text.includes('design') || text.includes('graphic') || text.includes('draw')) return 'Graphic/Design';
  return 'Other';
}

function getCategoryForAppOpt(app: App): string {
  const desc = app._descLower !== undefined ? app._descLower : (app.description || '').toLowerCase();
  const name = app._nameLower !== undefined ? app._nameLower : (app.name || '').toLowerCase();
  const text = desc + ' ' + name;

  if (text.includes('developer') || text.includes('code') || text.includes('git') || text.includes('terminal')) return 'Developer Tools';
  if (text.includes('photo') || text.includes('video') || text.includes('image') || text.includes('media')) return 'Photo/Video';
  if (text.includes('design') || text.includes('graphic') || text.includes('draw')) return 'Graphic/Design';
  return 'Other';
}

// Generate 100k apps
const apps: App[] = Array.from({ length: 100000 }).map((_, i) => ({
  name: `App${i} developer`,
  description: `This is a test description for app ${i} that does something`,
  homepage: `https://app${i}.com`,
  version: '1.0.0',
  type: i % 2 === 0 ? 'cask' : 'formula',
}));

const installedApps = new Set(['App0 developer', 'App10 developer']);

// Unoptimized filter
function filterUnoptimized(selectedType: string, selectedCategory: string, searchTerm: string) {
  return apps.filter((app) => {
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

// Prepare cached fields
const appsOpt = apps.map(app => {
  const newApp = { ...app };
  newApp._nameLower = (newApp.name || '').toLowerCase();
  newApp._descLower = (newApp.description || '').toLowerCase();
  newApp._homeLower = (newApp.homepage || '').toLowerCase();
  newApp._category = getCategoryForAppOpt(newApp);
  return newApp;
});

function filterOptimized(selectedType: string, selectedCategory: string, searchTerm: string) {
  const searchLower = searchTerm ? searchTerm.toLowerCase() : '';

  return appsOpt.filter((app) => {
    if (selectedType !== 'All' && app.type !== selectedType) return false;

    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Installed') {
        if (!installedApps.has(app.name)) return false;
      } else {
        const category = app._category || getCategoryForAppOpt(app);
        if (category !== selectedCategory) return false;
      }
    }

    if (searchLower) {
      const nameLower = app._nameLower || (app.name || '').toLowerCase();
      const descLower = app._descLower || (app.description || '').toLowerCase();
      const homeLower = app._homeLower || (app.homepage || '').toLowerCase();
      return (
        nameLower.includes(searchLower) ||
        descLower.includes(searchLower) ||
        homeLower.includes(searchLower)
      );
    }

    return true;
  });
}

// Measure Unoptimized
const start1 = performance.now();
filterUnoptimized('cask', 'Developer Tools', 'test description');
const end1 = performance.now();
console.log(`Unoptimized took: ${end1 - start1} ms`);

// Measure Optimized
const start2 = performance.now();
filterOptimized('cask', 'Developer Tools', 'test description');
const end2 = performance.now();
console.log(`Optimized took: ${end2 - start2} ms`);
