function getCategoryColorOld(label, categoryDictionary) {
    if (label === 'Other') return 'hsl(215, 16%, 47%)';
    const entry = Object.values(categoryDictionary.categories).find((c) => c.label === label);
    return entry ? entry.color : 'hsl(200, 10%, 50%)';
}

function getCategoryColorNew(label, categoryColorMap) {
    if (label === 'Other') return 'hsl(215, 16%, 47%)';
    return categoryColorMap.get(label) || 'hsl(200, 10%, 50%)';
}

const catDict = {
    categories: {}
};
const colorMap = new Map();

for (let i = 0; i < 50; i++) {
    const label = `Cat${i}`;
    const color = `#${i}${i}${i}`;
    catDict.categories[`c${i}`] = { label, color };
    colorMap.set(label, color);
}

const labelsToFind = ['Cat10', 'Cat40', 'Cat0', 'Other', 'Cat25'];

console.time('Old getCategoryColor');
for (let i = 0; i < 10000; i++) {
    for (const label of labelsToFind) {
        getCategoryColorOld(label, catDict);
    }
}
console.timeEnd('Old getCategoryColor');

console.time('New getCategoryColor');
for (let i = 0; i < 10000; i++) {
    for (const label of labelsToFind) {
        getCategoryColorNew(label, colorMap);
    }
}
console.timeEnd('New getCategoryColor');
