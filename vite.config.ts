import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The main entry is ~143 kB gzipped; PDF/DOCX parsers are already lazy-loaded.
    chunkSizeWarningLimit: 550,
  },
})
