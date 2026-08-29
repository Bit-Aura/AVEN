#!/usr/bin/env node

/**
 * postinstall patch for y-monaco
 * 
 * Problem: y-monaco imports 'monaco-editor/esm/vs/editor/editor.api.js'
 * but monaco-editor's package.json exports field maps "./*.js" → "./esm/vs/*.js".
 * This means the correct import should be 'monaco-editor/editor/editor.api.js'
 * (without the esm/vs/ prefix), which the exports field resolves to the same file.
 * 
 * Turbopack strictly enforces the exports field, so the original import path fails.
 * Webpack was more lenient and resolved it anyway.
 * 
 * This script patches y-monaco's source to use the exports-compliant import path.
 */

const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'node_modules', 'y-monaco', 'src', 'y-monaco.js');

if (!fs.existsSync(targetFile)) {
  console.log('[postinstall] y-monaco not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

const oldImport = "import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'";
const newImport = "import * as monaco from 'monaco-editor/editor/editor.api.js'";

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[postinstall] ✓ Patched y-monaco: updated monaco-editor import to use exports-compliant path.');
} else if (content.includes(newImport)) {
  console.log('[postinstall] y-monaco already patched, skipping.');
} else {
  console.log('[postinstall] ⚠ y-monaco import pattern not found, manual review needed.');
}
