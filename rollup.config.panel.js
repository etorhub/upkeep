import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import { minify } from 'rollup-plugin-esbuild-minify';

const onwarn = (warning, warn) => {
  if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('/node_modules/')) return;
  warn(warning);
};

const plugins = () => [nodeResolve(), commonjs(), typescript(), json(), minify()];

export default [
  {
    input: 'panel-src/main.ts',
    output: {
      file: 'custom_components/upkeep/panel/dist/main.js',
      format: 'es',
      inlineDynamicImports: true,
    },
    plugins: plugins(),
    onwarn,
  },
  // Loaded on every Home Assistant page so the sidebar can draw the brand mark.
  {
    input: 'src/brand/icons.ts',
    output: {
      file: 'custom_components/upkeep/panel/dist/upkeep-icons.js',
      format: 'es',
    },
    plugins: plugins(),
    onwarn,
  },
];
