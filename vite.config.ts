import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isGithubActions = process.env.GITHUB_ACTIONS === 'true'
const isUserOrOrgPages = repository.toLowerCase().endsWith('.github.io')

export default defineConfig({
  base: isGithubActions ? (isUserOrOrgPages ? '/' : `/${repository}/`) : '/',
  plugins: [react(), tailwindcss()],
})
