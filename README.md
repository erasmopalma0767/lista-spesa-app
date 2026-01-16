# Casa • Liste & Ricette

App web per gestire liste della spesa e ricette, sviluppata con React + Vite.

## Funzionalità

- 📝 Gestione liste della spesa multiple
- 🍳 Gestione ricette con categorie
- 🔐 Autenticazione Google con Firebase
- 💾 Salvataggio dati su Firestore
- 📱 **PWA installabile** su dispositivi mobili

## 🚀 Installazione come PWA (Progressive Web App)

L'app è configurata come PWA e può essere installata sul cellulare:

### Come installare sul cellulare:

1. **Genera le icone** (se non già presenti):
   - Avvia il server di sviluppo: `npm run dev`
   - Apri `http://localhost:5173/generate-icons.html` nel browser
   - Clicca sui pulsanti per generare `icon-192.png` e `icon-512.png`
   - I file verranno scaricati automaticamente
   - Sposta i file nella cartella `public/`

2. **Installa l'app**:
   - **Android (Chrome)**: 
     - Apri l'app nel browser Chrome
     - Tocca il menu (⋮) → "Installa app" o "Aggiungi alla schermata home"
   - **iOS (Safari)**:
     - Apri l'app nel browser Safari
     - Tocca il pulsante Condividi (□↑)
     - Seleziona "Aggiungi alla schermata Home"

3. **Su desktop**: L'app funziona normalmente nel browser. Alcuni browser moderni possono anche mostrare un'opzione di installazione.

## 🛠️ Sviluppo

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Build per produzione
npm run build

# Preview della build
npm run preview
```

## 📁 Struttura PWA

- `public/manifest.json` - Manifesto PWA con configurazione app
- `public/sw.js` - Service Worker per funzionalità offline
- `public/icon.svg` - Icona SVG sorgente
- `public/icon-192.png` - Icona 192x192 (da generare)
- `public/icon-512.png` - Icona 512x512 (da generare)

## 🔧 Configurazione Firebase

L'app richiede una configurazione Firebase per funzionare. Verifica che `src/firebase.js` contenga le credenziali corrette.
