import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';

const readonly = 'readonly';

const sharedGlobals = {
  AbortController: readonly,
  alert: readonly,
  Blob: readonly,
  Buffer: readonly,
  caches: readonly,
  cancelAnimationFrame: readonly,
  clearInterval: readonly,
  clearTimeout: readonly,
  console: readonly,
  crypto: readonly,
  document: readonly,
  fetch: readonly,
  FileReader: readonly,
  faceapi: readonly,
  FormData: readonly,
  globalThis: readonly,
  Headers: readonly,
  HTMLCanvasElement: readonly,
  Image: readonly,
  importScripts: readonly,
  localStorage: readonly,
  navigator: readonly,
  OffscreenCanvas: readonly,
  performance: readonly,
  process: readonly,
  prompt: readonly,
  Promise: readonly,
  requestAnimationFrame: readonly,
  indexedDB: readonly,
  ResizeObserver: readonly,
  Response: readonly,
  self: readonly,
  setInterval: readonly,
  setTimeout: readonly,
  SpeechRecognition: readonly,
  structuredClone: readonly,
  TextDecoder: readonly,
  TextEncoder: readonly,
  URL: readonly,
  URLSearchParams: readonly,
  Vosk: readonly,
  webkitSpeechRecognition: readonly,
  Worker: readonly,
  __QICN_RUNTIME_ENV__: readonly,
  window: readonly
};

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/canon/ArchitecturalGroundTruth.js',
      'src/canon/index.js'
    ]
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: sharedGlobals
    },
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-console': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-boolean-cast': 'off',
      'no-irregular-whitespace': 'off',
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      'react-hooks/exhaustive-deps': 'off'
    }
  },
  {
    files: [
      'src/App.jsx',
      'src/components/AccessGate.jsx',
      'src/components/ChatInterface.jsx',
      'src/components/ControlPanel.jsx',
      'src/components/ErrorBoundary.jsx',
      'src/components/NetworkCanvas.jsx',
      'src/components/StateProvider.jsx',
      'src/components/TabRouter.jsx',
      'src/components/TelemetryHUD.jsx',
      'src/components/lazy-tabs/**/*.jsx',
      'src/contexts/**/*.jsx',
      'src/simulation/SimulationController.js',
      'src/canon/finite_horizon/FiniteProjectionEvaluator.js',
      'src/canon/invariants/CanonicalInvariantPackage.js',
      'src/experiments/negative_controls_expanded.js'
    ],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^React$|^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
];
