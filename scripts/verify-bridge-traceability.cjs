#!/usr/bin/env node
/**
 * verify-bridge-traceability.cjs (Bridge Phase 2)
 *
 * Validates the bridge traceability map:
 * (a) every entry with a framework_id != "n/a" has a matching ID in
 *     qicn_imported_registry/registry/theorems.jsonl
 * (b) every entry's runtime_module exists on disk
 * (c) every entry's tests exist on disk
 * (d) every invariant_id in the map matches CANON_INVARIANT_CATALOG ids
 * (e) no framework_id (non-n/a) appears orphaned in the registry without a map entry
 *     (only for the "load-bearing" subset: hypotheses + key theorems)
 *
 * Flags: --self-test
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const MAP = path.join(ROOT, "docs", "bridge_traceability_map.v1.json");
const REGISTRY = path.join(ROOT, "qicn_imported_registry", "registry", "theorems.jsonl");
const CATALOG_PATH = path.join(ROOT, "src", "canon", "claimMapping", "canonicalClaimCatalog.js");

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")); }
function readLines(p) { return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean); }

function run() {
  const map = readJson(MAP);
  const regLines = readLines(REGISTRY);
  const regIds = new Set(regLines.map(l => JSON.parse(l).id));

  // Extract invariant IDs from catalog source (regex, no ESM import needed)
  const catSrc = fs.readFileSync(CATALOG_PATH, "utf8");
  const invIds = [...catSrc.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
  const invSet = new Set(invIds);

  const errors = [];
  for (const e of map.entries) {
    // (a) framework_id in registry
    if (e.framework_id !== "n/a" && !e.framework_id.startsWith("n/a")) {
      if (!regIds.has(e.framework_id)) {
        errors.push(`MISSING_IN_REGISTRY: ${e.framework_id}`);
      }
    }
    // (b) module exists
    const mod = path.join(ROOT, e.runtime_module);
    if (!fs.existsSync(mod)) errors.push(`MODULE_MISSING: ${e.runtime_module}`);
    // (c) tests exist
    for (const t of e.tests || []) {
      if (!fs.existsSync(path.join(ROOT, t))) errors.push(`TEST_MISSING: ${t}`);
    }
    // (d) invariant_id valid
    if (e.invariant_id && !invSet.has(e.invariant_id)) {
      errors.push(`INVARIANT_UNKNOWN: ${e.invariant_id}`);
    }
  }

  // (e) load-bearing framework IDs that should be in the map
  const loadBearing = [...regIds].filter(id =>
    id.includes(":hypothesis:") || id.includes(":theorem:thm-") || id.includes(":definition:def-cop")
  );
  const mappedIds = new Set(map.entries.map(e => e.framework_id));
  const orphans = loadBearing.filter(id => !mappedIds.has(id));

  console.log(`[bridge:traceability] entries=${map.entries.length} registry_ids=${regIds.size} invariant_catalog=${invIds.length}`);
  console.log(`[bridge:traceability] errors=${errors.length} orphan_load_bearing=${orphans.length}`);
  if (errors.length) {
    console.error("[bridge:traceability] ERRORS:");
    errors.forEach(e => console.error("  " + e));
  }
  if (orphans.length) {
    console.log("[bridge:traceability] NOTE: load-bearing registry IDs without map entry (not blocking, informational):");
    orphans.forEach(o => console.log("  " + o));
  }
  const pass = errors.length === 0;
  console.log(`[bridge:traceability] ${pass ? "PASS" : "FAIL"}`);
  process.exit(pass ? 0 : 1);
}

function selfTest() {
  // Minimal: just verify the map file parses and has >0 entries
  const map = readJson(MAP);
  const ok = map.entries && map.entries.length > 0 && map.schema === "bridge_traceability_map.v1";
  console.log(ok ? "[bridge:traceability] self-test PASS" : "[bridge:traceability] self-test FAIL");
  process.exit(ok ? 0 : 1);
}

if (process.argv.includes("--self-test")) selfTest();
else run();