================================================
FILE: examples/vite-react/README.md
================================================
# mediainfo.js Vite + React Example

This example shows how to use `mediainfo.js` in a Vite + React project, with proper handling of the WebAssembly (WASM) file.

## WebAssembly Handling

The `MediaInfoModule.wasm` file is copied into the build output using `vite-plugin-static-copy` to ensure it's available at runtime:

```js
viteStaticCopy({
  targets: [
    {
      src: path.join(
        import.meta.dirname,
        'node_modules',
        'mediainfo.js',
        'dist',
        'MediaInfoModule.wasm'
      ),
      dest: '',
    },
  ],
}),
```



================================================
FILE: examples/vite-react/eslint.config.js
================================================
import globals from 'globals'
import reactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js'
import tsEslint from 'typescript-eslint'

export default tsEslint.config(
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{js,ts,tsx}'],
    ...reactJsxRuntime,
    languageOptions: {
      ...reactJsxRuntime.languageOptions,
      globals: globals.browser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    ignores: ['dist/*', 'eslint.config.js', 'vite.config.ts'],
  }
)



================================================
FILE: examples/vite-react/index.html
================================================
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>mediainfo.js Vite/React Example</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>



================================================
FILE: examples/vite-react/package.json
================================================
{
  "name": "mediainfojs-vite-react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "mediainfo.js": "link:../..",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.0",
    "eslint": "^9.24.0",
    "eslint-plugin-react": "^7.37.5",
    "globals": "^16.0.0",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.30.1",
    "vite": "^6.3.2",
    "vite-plugin-static-copy": "^2.3.1"
  }
}



================================================
FILE: examples/vite-react/tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}



================================================
FILE: examples/vite-react/vite.config.ts
================================================
import path from 'path'
import { defineConfig, searchForWorkspaceRoot } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: path.join(
            import.meta.dirname,
            'node_modules',
            'mediainfo.js',
            'dist',
            'MediaInfoModule.wasm'
          ),
          dest: '',
        },
      ],
    }),
  ],
  server: {
    fs: {
      allow: [
        // search up for workspace root
        searchForWorkspaceRoot(process.cwd()),
        // allow wasm file
        '../../dist/MediaInfoModule.wasm',
      ],
    },
  },
})



================================================
FILE: examples/vite-react/src/App.tsx
================================================
import { type ChangeEvent, useState, useEffect, useRef } from 'react'

import mediaInfoFactory from 'mediainfo.js'
import type { MediaInfo, ReadChunkFunc } from 'mediainfo.js'

function makeReadChunk(file: File): ReadChunkFunc {
  return async (chunkSize: number, offset: number) =>
    new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer())
}

function App() {
  const mediaInfoRef = useRef<MediaInfo<'text'> | null>(null)
  const [result, setResult] = useState('')

  useEffect(() => {
    mediaInfoFactory({ format: 'text' })
      .then((mi) => {
        mediaInfoRef.current = mi
      })
      .catch((error: unknown) => {
        console.error(error)
      })

    return () => {
      if (mediaInfoRef.current) {
        mediaInfoRef.current.close()
      }
    }
  }, [])

  const handleChange = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    if (file && mediaInfoRef.current) {
      mediaInfoRef.current
        .analyzeData(file.size, makeReadChunk(file))
        .then(setResult)
        .catch((error: unknown) => {
          console.error(error)
        })
    }
  }

  return (
    <>
      <input type="file" placeholder="Select file..." onChange={handleChange} />
      <pre>{result}</pre>
    </>
  )
}

export default App



================================================
FILE: examples/vite-react/src/main.tsx
================================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

const rootEl = document.getElementById('root')

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}



================================================
FILE: examples/vite-react/src/vite-env.d.ts
================================================
/// <reference types="vite/client" />
