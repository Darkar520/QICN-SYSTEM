import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
register(pathToFileURL(path.resolve(process.cwd(), 'tests/lib/headless-react-loader.mjs')).href);