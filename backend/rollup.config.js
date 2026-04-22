import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/main.ts',
    output: {
        file: 'build/main.js',
        format: 'iife',
        name: 'nakamaBundle',
        extend: true,
        sourcemap: false,
    },
    plugins: [
        resolve({ extensions: ['.ts', '.js'] }),
        commonjs(),
        typescript(),
    ],
};