const fs = require('fs');

const files = [
  'src/app/(dashboard)/learner/page.tsx',
  'src/app/(dashboard)/learner/simulator/page.tsx',
  'src/components/learner/CurrentNodeCard.tsx',
  'src/app/(dashboard)/learner/mentor/page.tsx',
  'src/components/AiCoachDrawer.tsx'
];

const replacements = {
  // Text colors
  'text-slate-100': 'text-aven-text',
  'text-slate-200': 'text-aven-text',
  'text-slate-300': 'text-aven-text-subtle',
  'text-slate-400': 'text-aven-text-subtle',
  'text-slate-500': 'text-aven-text-muted',
  'text-slate-600': 'text-aven-text-muted',
  // Backgrounds
  'bg-surface-secondary/90': 'bg-aven-surface',
  'bg-surface-secondary/50': 'bg-aven-surface',
  'bg-surface-secondary/40': 'bg-aven-surface',
  'bg-surface-secondary': 'bg-aven-surface',
  'bg-surface-tertiary': 'bg-aven-base border border-aven-border',
  'bg-surface': 'bg-aven-base',
  'bg-background': 'bg-aven-base',
  'bg-background/90': 'bg-aven-base/90',
  'bg-border/50': 'bg-aven-surface',
  // Borders
  'border-border/50': 'border-aven-border',
  'border-border/30': 'border-aven-border',
  'border-border': 'border-aven-border',
  // Brand to Primary
  'text-brand-300': 'text-aven-primary',
  'text-brand-400': 'text-aven-primary',
  'text-brand-500': 'text-aven-primary',
  'bg-brand-500/10': 'bg-aven-primary/10',
  'bg-brand-500/20': 'bg-aven-primary/20',
  'border-brand-500/20': 'border-aven-primary/20',
  'border-brand-500/30': 'border-aven-primary/30',
  // Indigo to Primary
  'bg-indigo-500/10': 'bg-aven-primary/10',
  'bg-indigo-500/20': 'bg-aven-primary/20',
  'text-indigo-400': 'text-aven-primary',
  'text-indigo-300': 'text-aven-primary',
  'border-indigo-500/30': 'border-aven-primary/30',
  // Text white issues on light bg
  'text-white': 'text-aven-text', // Will need manual check on CurrentNodeCard
};

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // For CurrentNodeCard, text-white is used inside the purple card, so keep it there!
    if (file.includes('CurrentNodeCard.tsx')) {
        content = content.replace(/text-white/g, 'text-aven-base'); // better to use aven-base for white text on primary
        content = content.replace(/bg-aven-text-subtle/g, 'bg-[#2b2b2a]'); 
    } else {
        // Normal replacements
        for (const [key, value] of Object.entries(replacements)) {
          // Replace exact class names
          const regex = new RegExp(`\\b${key}\\b`, 'g');
          content = content.replace(regex, value);
        }
    }
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
