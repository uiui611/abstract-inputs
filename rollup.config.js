import pluginTypescript from 'rollup-plugin-typescript2'
import { terser } from 'rollup-plugin-terser'
import copy from 'rollup-plugin-copy'

import pkg from './package.json'

const name = pkg.name.replace(/^@.*\//, '')

const banner = `/*
 @mizu-mizu/abstract-inputs.js VERSION ${pkg.version}
 Released under the MIT License.
 https://raw.githubusercontent.com/uiui611/abstract-inputs/master/LICENSE
*/
`

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        banner,
        name,
        file: `dist/${name}.js`,
        format: 'umd',
        sourcemap: 'inline',
      },
      {
        banner,
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
