const allApps = [];
for (let i = 0; i < 100000; i++) {
  allApps.push({ name: 'app' + i, type: 'cask' });
}

const installedApps = new Set();
for (let i = 0; i < 500; i++) {
  installedApps.add('app' + (i * 200));
}

console.time('O(N) with find');
for (const appName of installedApps) {
  const app = allApps.find(a => a.name === appName);
}
console.timeEnd('O(N) with find');

const allAppsMap = new Map();
for (const app of allApps) {
  allAppsMap.set(app.name, app);
}

console.time('O(1) with Map');
for (const appName of installedApps) {
  const app = allAppsMap.get(appName);
}
console.timeEnd('O(1) with Map');
