# Bundle Analysis

Generated during Phase 9 with:

```powershell
$env:BUILD_MODE='prod'; npm run build:js; Remove-Item Env:\BUILD_MODE
node -e "const m=require('./dist/meta.json'); Object.entries(m.inputs).sort((a,b)=>b[1].bytes-a[1].bytes).slice(0,15).forEach(([k,v])=>console.log(String(v.bytes).padStart(8), k))"
```

Production JS build completed and emitted `dist/meta.json`. The largest inputs by unbundled bytes were:

| Rank | Bytes | Input |
| ---: | ---: | --- |
| 1 | 1,065,698 | `node_modules/react-dom/cjs/react-dom-client.development.js` |
| 2 | 578,152 | `src/components/SimulationEngine.jsx` |
| 3 | 154,429 | `src/simulation/SensoryPerceptionEngine.js` |
| 4 | 103,856 | `src/simulation/OntologicalSingularityCore.js` |
| 5 | 81,776 | `src/index_network_canvas.jsx` |
| 6 | 47,510 | `src/simulation/QuantumEntropyBridge.js` |
| 7 | 47,219 | `node_modules/react/cjs/react.development.js` |
| 8 | 37,023 | `src/simulation/PhenomenologyCore.js` |
| 9 | 29,299 | `src/utils/cognitiveEmergenceEvaluation.js` |
| 10 | 27,926 | `src/utils/narrativeIntegrity.js` |
| 11 | 23,414 | `src/simulation/HolographicMemoryNexus.js` |
| 12 | 18,138 | `services/config.js` |
| 13 | 17,673 | `node_modules/react-dom/cjs/react-dom.development.js` |
| 14 | 15,836 | `src/content/groundedConcepts.js` |
| 15 | 14,937 | `src/utils/integrity.js` |

## Interpretation

The dominant application input remains `SimulationEngine.jsx`; Phase 9 reduced `App.jsx` to a shell but intentionally did not split the simulation loop. The bundle also includes React development artifacts in this build profile, so production environment replacement is a future optimization target distinct from runtime correctness.

Five More-tab wrappers are lazy-loaded: `QICNBTab`, `ApiControlTab`, `SensoryTab`, `SovereigntyTab`, and `AutonomyEvolutionTab`. This creates verified lazy boundaries, but the heavy render functions still live inside `SimulationEngine.jsx`; deeper code splitting requires extracting those render functions without changing evidence semantics.
