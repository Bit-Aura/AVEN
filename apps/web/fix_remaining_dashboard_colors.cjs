const fs = require('fs');
const path = require('path');

const directoriesToSearch = [
  'src/app/(dashboard)',
  'src/components'
];

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath)
  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          arrayOfFiles.push(path.join(dirPath, "/", file))
      }
    }
  })

  return arrayOfFiles
}

let allFiles = [];
directoriesToSearch.forEach(dir => {
    allFiles = getAllFiles(dir, allFiles);
});

const replacements = {
  'text-slate-100': 'text-aven-text',
  'text-slate-200': 'text-aven-text',
  'text-slate-300': 'text-aven-text-subtle',
  'text-slate-400': 'text-aven-text-subtle',
  'text-slate-500': 'text-aven-text-muted',
  'text-slate-600': 'text-aven-text-muted',
  'bg-surface-secondary/90': 'bg-aven-surface',
  'bg-surface-secondary/50': 'bg-aven-surface',
  'bg-surface-secondary/40': 'bg-aven-surface',
  'bg-surface-secondary': 'bg-aven-surface',
  'bg-surface-tertiary': 'bg-aven-base border border-aven-border',
  'bg-surface': 'bg-aven-base',
  'bg-background': 'bg-aven-base',
  'bg-background/90': 'bg-aven-base/90',
  'bg-border/50': 'bg-aven-surface',
  'border-border/50': 'border-aven-border',
  'border-border/30': 'border-aven-border',
  'border-border': 'border-aven-border',
  'text-brand-300': 'text-aven-primary',
  'text-brand-400': 'text-aven-primary',
  'text-brand-500': 'text-aven-primary',
  'bg-brand-500/10': 'bg-aven-primary/10',
  'bg-brand-500/20': 'bg-aven-primary/20',
  'border-brand-500/20': 'border-aven-primary/20',
  'border-brand-500/30': 'border-aven-primary/30',
  'bg-indigo-500/10': 'bg-aven-primary/10',
  'bg-indigo-500/20': 'bg-aven-primary/20',
  'text-indigo-400': 'text-aven-primary',
  'text-indigo-300': 'text-aven-primary',
  'border-indigo-500/30': 'border-aven-primary/30',
};

// Files to NOT apply text-white conversion to (since they use dark backgrounds)
const keepWhiteList = [
    'CurrentNodeCard.tsx',
    'Sidebar.tsx',
    'RoleGuard.tsx'
];

let updatedCount = 0;

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let hasChanges = false;
  
  // Custom logic for auth/Sidebar if needed, but since we are only searching dashboard/components, Sidebar is included.
  const isExcludedFromWhiteText = keepWhiteList.some(k => file.includes(k));

  if (!isExcludedFromWhiteText) {
      if(content.includes('text-white')) {
          content = content.replace(/\btext-white\b/g, 'text-aven-text');
          hasChanges = true;
      }
  }

  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    if (regex.test(content)) {
        content = content.replace(regex, value);
        hasChanges = true;
    }
  }
  
  if (hasChanges) {
    fs.writeFileSync(file, content);
    updatedCount++;
    console.log(`Updated ${file}`);
  }
});
console.log(`Finished updating ${updatedCount} files.`);
