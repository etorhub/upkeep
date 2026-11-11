import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

const onwarn = (warning, warn) => {
  if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('/node_modules/')) return;
  warn(warning);
};

const plugins = (withJson = false) => {
  const list = [nodeResolve(), commonjs(), typescript()];
  if (withJson) list.push(json());
  return list;
};

export default [
  {
    input: 'src/upkeep-card.ts',
    output: {
      file: 'custom_components/upkeep/www/upkeep-card.js',
      format: 'es',
      inlineDynamicImports: true,
    },
    plugins: plugins(true),
    onwarn,
  },
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
];
