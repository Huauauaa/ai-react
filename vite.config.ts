import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const isUserOrOrgPages = repository.toLowerCase().endsWith('.github.io')

/** GitHub Pages has no SPA fallback; copy index.html → 404.html so deep links refresh work. */
function githubPagesSpa404(): Plugin {
  let outDir = 'dist'
  let root = process.cwd()
  return {
    name: 'github-pages-spa-404',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
      root = config.root
    },
    async closeBundle() {
      const indexHtml = join(root, outDir, 'index.html')
      const notFoundHtml = join(root, outDir, '404.html')
      await copyFile(indexHtml, notFoundHtml)
    },
  }
}

export default defineConfig({
  base: isGithubActions ? (isUserOrOrgPages ? '/' : `/${repository}/`) : '/',
  plugins: [react(), tailwindcss(), githubPagesSpa404()],
})
