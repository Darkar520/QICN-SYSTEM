import { register } from 'node:module';
register(new URL('./frozen-runtime-loader.mjs', import.meta.url));
