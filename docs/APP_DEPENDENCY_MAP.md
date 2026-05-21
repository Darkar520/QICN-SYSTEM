# App Dependency Map

Phase 9 documents the runtime dependencies after the conservative monolith split. `src/App.jsx` is now a composition shell; the legacy interactive runtime body lives in `src/components/SimulationEngine.jsx` until the remaining stateful subtrees can be extracted behind contract tests.

## Hook Inventory

| Hook | Count | Primary responsibility |
| --- | ---: | --- |
| `useState` | 78 | UI state, tick metrics, chat/API state, sensory state, selfpatch controls |
| `useRef` | 58 | engine singletons, telemetry buffers, mutation ledgers, canvas state, scheduler handles |
| `useCallback` | 35 | simulation cycle, persistence, LLM calls, selfpatch calls, tab events |
| `useEffect` | 32 | bootstrapping, timers, sensory lifecycle, persistence and tab-specific refresh |

## State Classes

| Class | Representative fields | Current owner | Extraction status |
| --- | --- | --- | --- |
| `simulation_state` | `isRunning`, `simulationStep`, `ccc`, `pmia`, `topologyMetrics`, `fieldMetrics`, `ontologicalState` | `SimulationEngine.jsx` | Runtime preserved; read-only context boundary created |
| `telemetry_state` | `canvasTelemetryRef`, `ppsMetricsRef`, `runtimeBudgetSnapshotRef`, `entropyModeRef`, `integrityAuditLogRef` | `SimulationEngine.jsx` | Runtime preserved; `TelemetryHUD.jsx` boundary created |
| `network_state` | `visualNodes`, `NetworkCanvas`, canvas telemetry callback, worker state | `SimulationEngine.jsx` + `index_network_canvas.jsx` | `NetworkCanvas.jsx` boundary wraps the canvas surface |
| `chat_state` | `chatHistory`, `isChatting`, `apiCallMetrics`, rate-limit and cooldown fields | `SimulationEngine.jsx` | `ChatInterface.jsx` boundary created |
| `config_state` | `mutableConfig`, quantum UI config, custom frontend keys, runtime flags | `SimulationEngine.jsx` + `runtimeEnv.js` | `SimulationConfigContext.jsx` shell context created |
| `ui_state` | selected tab, More menu, guide filters, modals, tours, navigation visibility | `SimulationEngine.jsx` | `TabRouter.jsx` and `ControlPanel.jsx` boundaries created |

## Cross-Responsibility Bridges

| Bridge | Crosses | Risk | Phase 9 handling |
| --- | --- | --- | --- |
| `runSimulationCycle` | simulation, telemetry, UI, sensory, claim-facing diagnostics | High | Kept intact in `SimulationEngine.jsx`; source tests now anchor there |
| `simulationControllerRef` | runtime engine, `OntologicalSingularityCore`, planner/world model | High | Preserved as the single controller source of truth |
| `robustFetchLLMResponseTracked` | chat, API telemetry, auth state, selected tab | Medium | Kept intact; chat boundary added without moving call graph |
| `renderCurrentTab` | navigation, local UI subtrees, tab-specific side effects | Medium | Five More-tab surfaces wrapped in lazy modules |
| `buildWorkspaceSnapshot` inputs | runtime telemetry, canvas diagnostics, error counters | High | Existing liveness ordering test retargeted to `SimulationEngine.jsx` |

## Conservative Deviation

The roadmap requested full extraction of every responsibility into independently stateful components. The implemented Phase 9 split is deliberately narrower: it moves the runtime body out of `App.jsx`, creates the expected contexts and component boundaries, and lazy-loads five More-tab wrappers, while preserving the internal loop and state graph in one file. This avoids silently changing tick semantics, claim-facing evidence contracts, or the already verified `SimulationController` binding.
