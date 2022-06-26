import pluginTypescript from 'rollup-plugin-typescript2'
import { terser } from 'rollup-plugin-terser'
import copy from 'rollup-plugin-copy'

import pkg from './package.json'

const name = pkg.name.replace(/^@.*\//, '')

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        name,
        file: `dist/${name}.js`,
        format: 'umd',
        sourcemap: 'inline',
      },
      {
        name,
        file: `dist/${name}.mjs`,
        format: 'es',
        sourcemap: 'inline',
      },
      {
        name,
        file: `dist/${name}.min.mjs`,
        format: 'es',
        sourcemap: 'inline',
        plugins: [
          terser(),
        ]
      },
      {
        name,
        file: `dist/${name}.min.js`,
        format: 'umd',
        sourcemap: 'inline',
        plugins: [
          terser(),
        ]
      }
    ],
    plugins: [
      pluginTypescript(),
      copy({
        targets: [{ src: 'src/@types/**/*', dest: 'dist/@types'}]
      })
    ]
  }
]
