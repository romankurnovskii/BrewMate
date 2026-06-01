const allApps = [];
for (let i = 0; i < 100000; i++) {
  allApps.push({ name: 'app' + i, type: i % 2 === 0 ? 'cask' : 'formula' });
}

const installedApps = new Set();
for (let i = 0; i < 200; i++) {
  installedApps.add('app' + Math.floor(Math.random() * 100000));
}

const allAppsMap = new Map();
for (const app of allApps) {
  allAppsMap.set(app.name, app);
}

console.time('find (O(n²))');
let c1 = 0;
for (const appName of installedApps) {
  const app = allApps.find(a => a.name === appName);
  if (app) c1++;
}
console.timeEnd('find (O(n²))');

console.time('map (O(1))');
let c2 = 0;
for (const appName of installedApps) {
  const app = allAppsMap.get(appName);
  if (app) c2++;
}
console.timeEnd('map (O(1))');
