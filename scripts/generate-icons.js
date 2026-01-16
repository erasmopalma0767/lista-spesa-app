#!/usr/bin/env node

/**
 * Script per generare le icone PWA dall'SVG
 * 
 * Nota: Questo script richiede che tu abbia installato 'sharp':
 * npm install --save-dev sharp
 * 
 * Alternativamente, usa il tool HTML: generate-icons.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const svgPath = path.join(publicDir, 'icon.svg');

async function generateIcons() {
  try {
    // Prova a importare sharp
    const sharp = (await import('sharp')).default;
    
    // Leggi l'SVG
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Genera icon-192.png
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    
    console.log('✓ icon-192.png generata');
    
    // Genera icon-512.png
    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    
    console.log('✓ icon-512.png generata');
    console.log('\n🎉 Tutte le icone sono state generate con successo!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Errore: sharp non è installato.');
      console.error('\nPer installarlo, esegui:');
      console.error('  npm install --save-dev sharp');
      console.error('\nOppure usa il tool HTML:');
      console.error('  1. Avvia: npm run dev');
      console.error('  2. Apri: http://localhost:5173/generate-icons.html');
      process.exit(1);
    } else {
      console.error('❌ Errore:', error.message);
      process.exit(1);
    }
  }
}

generateIcons();
