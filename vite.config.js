import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { alphaTab } from '@coderline/alphatab-vite'
import { readFileSync } from 'node:fs'

// La version de package.json est la seule source de vérité :
// elle est affichée dans "À propos" et reprise par android/app/build.gradle
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Fichiers du lecteur de tablatures (alphaTab), servis sous /alphatab/ : seulement la police de
// notation au format WOFF2 et la banque de sons compressée (le module alphaTab copierait tous les
// formats, soit environ 4 Mo)
const ALPHATAB_DIST = new URL('./node_modules/@coderline/alphatab/dist/', import.meta.url)
const ALPHATAB_ASSETS = {
  'alphatab/font/Bravura.woff2': { file: 'font/Bravura.woff2', type: 'font/woff2' },
  'alphatab/soundfont/sonivox.sf3': { file: 'soundfont/sonivox.sf3', type: 'application/octet-stream' },
}
const alphaTabAssets = () => ({
  name: 'mymusiccoach-alphatab-assets',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const asset = ALPHATAB_ASSETS[(req.url || '').split('?')[0].replace(/^\//, '')]
      if (!asset) return next()
      res.setHeader('Content-Type', asset.type)
      res.end(readFileSync(new URL(asset.file, ALPHATAB_DIST)))
    })
  },
  generateBundle() {
    for (const [fileName, asset] of Object.entries(ALPHATAB_ASSETS)) {
      this.emitFile({ type: 'asset', fileName, source: readFileSync(new URL(asset.file, ALPHATAB_DIST)) })
    }
  },
})

export default defineConfig({
  plugins: [
    react(),
    // Workers et audio worklet d'alphaTab ; ses fichiers annexes sont copiés par alphaTabAssets
    alphaTab({ assetOutputDir: false }),
    alphaTabAssets(),
  ],
  base: './',
  build: {
    // Le lecteur de tablatures (alphaTab, ~1,2 Mo) est un fichier à part, chargé seulement à
    // l'ouverture d'une tablature. Le fichier principal de l'app doit rester sous 500 Ko.
    chunkSizeWarningLimit: 1300,
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    setupFiles: ['./src/test/setup.js'],
  },
})
