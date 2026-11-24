---
name: qicn-living-knowledge-sync
description: >-
  Workspace synchronization runbook for QICN-SYSTEM's living knowledge vault
  (`knowledge/qicn_living_vault.v1.json`, `src/language/frameworkSummary.generated.js`,
  and `src/language/moduleInventory.generated.js`). Use after any commit in
  `../qicn-framework-ordenado` or any runtime module/parameter update in `QICN-SYSTEM`.
---

# QICN-SYSTEM Living Knowledge Vault Sync

Keep `knowledge/qicn_living_vault.v1.json` permanently synchronized with committed `HEAD` of `../qicn-framework-ordenado` (read-only) and live `src/` of `QICN-SYSTEM` so Gemini (Context Caching + 6 read-only Runtime Skills) and local «Solo motor» always have deep, current access to every theorem, macro, Lean 4 module, claim registry entry, prediction, paper abstract/section, and runtime parameter without resending the corpus on every prompt.

## Commands

```powershell
npm run sync:knowledge-vault
npm run verify:knowledge-vault
```

## Verification Checklist

1. `npm run verify:knowledge-vault` prints `"status":"up_to_date"` and `"external_support_certified":false`.
2. `node tests/language-symbiotic-three-layers.v1.test.mjs` passes (checks live SHA-256 vault integrity, deep lookups for theorems/macros/Lean/claims/predictions, Runtime Skills, Context Caching, and mixed-sentence adversarial negative controls).
3. `npm run build` copies `knowledge/qicn_living_vault.v1.json` to `dist/knowledge/qicn_living_vault.v1.json` without bloating `dist/bundle.js`.
4. Never edit `../qicn-framework-ordenado` during sync and never relax `external_support_certified = false`.
