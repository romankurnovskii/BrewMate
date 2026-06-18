const categories = {
    c1: { label: 'Web', color: '#111' },
    c2: { label: 'Dev', color: '#222' },
    c3: { label: 'Utility', color: '#333' }
};

const labelsToFind = ['Web', 'Dev', 'Utility', 'Other', 'Web', 'Dev'];

console.time('Object.values');
for (let i = 0; i < 10000; i++) {
    for (const label of labelsToFind) {
        if (label === 'Other') continue;
        const entry = Object.values(categories).find((c) => c.label === label);
        const color = entry ? entry.color : '#000';
    }
}
console.timeEnd('Object.values');

const colorMap = new Map();
Object.values(categories).forEach(c => colorMap.set(c.label, c.color));

console.time('Map lookup');
for (let i = 0; i < 10000; i++) {
    for (const label of labelsToFind) {
        if (label === 'Other') continue;
        const color = colorMap.get(label) || '#000';
    }
}
console.timeEnd('Map lookup');
