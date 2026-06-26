// Registers the resolve hook in the loader thread. Use via:
//   node --import ./tests/lib/register-loader.mjs <script>
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
register('./headless-react-loader.mjs', pathToFileURL('./tests/lib/').href);