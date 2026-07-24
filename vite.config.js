import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './'  -> chemins d'assets RELATIFS. Indispensable pour un dépôt FTP
// à la racine d'un sous-domaine (et ça marche aussi dans un sous-dossier).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
