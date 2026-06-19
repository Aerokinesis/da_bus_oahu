import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Unique id per deployment. Vercel exposes the commit SHA at build time;
// fall back to a timestamp for local builds.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)

// Emits /version.json into the build output. The running app compares its
// embedded __BUILD_ID__ against this file to detect new deployments
// (see src/hooks/useUpdateCheck.js).
const versionFilePlugin = () => ({
  name: 'emit-version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId }),
    })
  },
})

export default defineConfig(({ mode }) => ({
  plugins:
    mode === 'development'
      ? [react(), basicSsl()]
      : [react(), versionFilePlugin()],
  server: {
    proxy: {
      // Dev only: forward /api to the local Express backend so the HTTPS dev
      // server (basicSsl) and HTTP backend don't trip mixed-content or CORS.
      '/api': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
}))
