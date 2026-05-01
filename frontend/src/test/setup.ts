import '@testing-library/jest-dom'

Object.defineProperty(globalThis, 'import.meta', {
  value: {
    env: {
      VITE_SERVER_URL: 'http://localhost:3000/api',
    },
  },
  writable: true,
})

if (!globalThis.crypto?.randomUUID) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      subtle: {},
    },
  })
}
