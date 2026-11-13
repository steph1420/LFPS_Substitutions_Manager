import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Stage 1 preview: relative base so it can sit on any preview URL, never on the live site.
export default defineConfig({ base: './', plugins: [react()], build: { outDir: 'dist' } })
