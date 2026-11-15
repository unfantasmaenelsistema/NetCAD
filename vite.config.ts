import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base relativa: funciona igual en GitHub Pages (/NetCAD/) que en local
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
