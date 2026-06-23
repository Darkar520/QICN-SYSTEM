#!/usr/bin/env node
/**
 * build-g1-candidate-export.cjs (Bridge Phase 3)
 *
 * Runtime -> Framework candidate channel for gap G1.1.
 *
 * Takes a runtime episode artifact directory (run_summary.json, run_header.json,
 * admissibility.json) and shapes the six canonical invariants into the
 * measurement_points form expected by the framework's G1.1 external-session-zero
 * scaffold (EXTERNAL_SESSION_ZERO_MANIFEST_SCAFFOLD_G1.1.json).
 *
 * HARD GOVERNANCE BOUNDARY (anti-inflation, non-negotiable):
 *  - The runtime is NOT a valid external subject. Per INSTRUCCIONES.md 6.1 and the
 *    G1.1 protocol scaffold, the QICN runtime / any LLM backend cannot be the
 *    subject under study NOR the judge. So this export is ALWAYS inadmissible as
 *    external evidence by construction.
 *  - observed_delta is filled with a runtime SELF-measurement, explicitly labeled
 *    INTERNAL_RUNTIME_SELF_MEASUREMENT and admissible_as_external=false.
 *  - qicn_prediction / rival_prediction / measurement_sigma are NEVER fabricated:
 *    they stay preregistration placeholders (filling them here would be circular).
 *  - The manifest status is NOT_EVALUABLE_RUNTIME_SELF_MEASUREMENT; dataset_origin
 *    is runtime_internal_self_measurement (the governance-excluded case).
 *  - external_support_certified stays false. Nothing is promoted.
 *
 * Purpose: build and test the export PLUMBING so that, when a real external
 * experiment on a declared physical substrate is run by a third party, the same
 * shaping tool exists. The runtime's own data is a self-rejecting stand-in.
 *
 * Flags:
 *   --run-dir=<dir>   runtime episode artifact directory (required for real run)
 *   --out=<path>      output path (default artifacts/bridge/g1_candidate_export.v1.json)
 *   --self-test       internal logic tests, exit 0/1
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

const SEAL = Object.freeze({
  status_class: "NON_CANONICAL",
  epistemic_class: "CANDIDATE_INTERNAL",
  evidence_class: "NOT_EXTERNAL_VALIDATION",
  external_support_certified: false,
  FULL_COP_MEMBERSHIP: "NOT_YET",
  claim_promotion: "NONE",
  note: "Runtime self-measurement. Inadmissible as external evidence by construction (runtime is neither subject nor judge). Must never be passed to an adjudicator as an external dataset."
});

// Canonical six-invariant -> primary runtime metric mapping (from
// src/canon/claimMapping/canonicalClaimCatalog.js runtimeSignals, primary signal).
const INVARIANT_METRIC = Object.freeze([
  { invariant_id: "I_per", name: "structural_persistence", metric: "stasis_index" },
  { invariant_id: "I_ri", name: "rigid_identity", metric: "identity_stability_score" },
  { invariant_id: "I_int", name: "causal_integration", metric: "pmia" },
  { invariant_id: "I_cont", name: "operational_continuity", metric: "predictive_consistency" },
  { invariant_id: "I_diff", name: "non_null_differentiation", metric: "beth_q" },
  { invariant_id: "I_leg", name: "operational_legibility", metric: "operational_determinism_score" }
]);

const PLACEHOLDER_PRED = "TO_BE_PREREGISTERED";
const PLACEHOLDER_SIGMA = "TO_BE_PREREGISTERED_INDEPENDENT_OF_QICN";
const PLACEHOLDER_MEAS = "TO_BE_MEASURED";

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")); }

/** Pure: build the candidate export object from parsed artifacts. Unit-testable. */
function buildExport({ runHeader, runSummary, admissibility }) {
  const metrics = (runSummary && runSummary.metrics) || {};
  const ts = (runSummary && runSummary.endTime) || (runHeader && runHeader.startTime) || null;

  const measurement_points = INVARIANT_METRIC.map((m, i) => {
    const v = metrics[m.metric];
    const observed = Number.isFinite(Number(v)) ? Number(v) : null;
    return {
      id: `m_internal_${String(i + 1).padStart(3, "0")}_${m.invariant_id}`,
      timestamp: ts,
      // observed_delta carries a runtime SELF-measurement, NOT an external observable.
      observed_delta: observed,
      observed_delta_source: `runtime_metric:${m.metric}`,
      observed_delta_class: "INTERNAL_RUNTIME_SELF_MEASUREMENT",
      // Predictions and sigma are NEVER fabricated by the runtime (anti-circular).
      qicn_prediction: PLACEHOLDER_PRED,
      rival_prediction: PLACEHOLDER_PRED,
      measurement_sigma: PLACEHOLDER_SIGMA,
      noise_floor: PLACEHOLDER_MEAS,
      invariant_id: m.invariant_id,
      invariant_name: m.name,
      admissible_as_external: false
    };
  });

  return {
    schema: "g1_candidate_export.v1",
    _seal: SEAL,
    generated_at: new Date().toISOString(),
    bridge_phase: 3,
    manifest_id: "G1-CANDIDATE-RUNTIME-INTERNAL",
    status: "NOT_EVALUABLE_RUNTIME_SELF_MEASUREMENT",
    dataset_origin: "runtime_internal_self_measurement",
    target_scaffold: "docs/ai-platform-outputs/preregistrations/EXTERNAL_SESSION_ZERO_MANIFEST_SCAFFOLD_G1.1.json (framework)",
    source_run: {
      runId: runHeader && runHeader.runId,
      versionHash: runHeader && runHeader.versionHash,
      evidenceScope: (runHeader && runHeader.lineage && runHeader.lineage.evidenceScope) || "INTERNAL_SUPPORT_ONLY",
      ticks_hash: (runSummary && runSummary.ticks_hash) || (admissibility && admissibility.ticks_hash) || null,
      admissibility_status: (admissibility && admissibility.status) || null
    },
    inadmissibility_reasons: [
      "subject_is_runtime_self: QICN runtime cannot be the external subject (INSTRUCCIONES 6.1).",
      "predictions_not_preregistered: qicn_prediction/rival_prediction are placeholders.",
      "sigma_not_independently_characterized: measurement_sigma is a placeholder.",
      "dataset_origin_not_external: must be non_synthetic external, collected by a third party.",
      "no_independent_adjudicator: scoring/judging cannot be the runner."
    ],
    measurement_points
  };
}

/** Validate the export honors all governance boundaries. Returns {ok, errors}. */
function validateExport(exp) {
  const errors = [];
  if (!exp._seal || exp._seal.external_support_certified !== false) errors.push("SEAL_MISSING_OR_CERTIFIED_TRUE");
  if (exp._seal && exp._seal.epistemic_class !== "CANDIDATE_INTERNAL") errors.push("SEAL_NOT_CANDIDATE_INTERNAL");
  if (exp.status === "external_dataset") errors.push("STATUS_CLAIMS_EXTERNAL");
  if (exp.dataset_origin !== "runtime_internal_self_measurement") errors.push("DATASET_ORIGIN_NOT_INTERNAL");
  if (!Array.isArray(exp.measurement_points) || exp.measurement_points.length === 0) errors.push("NO_MEASUREMENT_POINTS");
  for (const p of exp.measurement_points || []) {
    if (p.admissible_as_external !== false) errors.push(`POINT_ADMISSIBLE_TRUE:${p.id}`);
    // predictions/sigma MUST be placeholders, never numbers (anti-fabrication)
    if (typeof p.qicn_prediction === "number") errors.push(`QICN_PREDICTION_FABRICATED:${p.id}`);
    if (typeof p.rival_prediction === "number") errors.push(`RIVAL_PREDICTION_FABRICATED:${p.id}`);
    if (typeof p.measurement_sigma === "number") errors.push(`SIGMA_FABRICATED:${p.id}`);
    // required shape fields present
    for (const f of ["id", "observed_delta", "qicn_prediction", "rival_prediction", "measurement_sigma", "noise_floor"]) {
      if (!(f in p)) errors.push(`POINT_MISSING_FIELD:${p.id}:${f}`);
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Simulate the framework adjudicator gate: would it accept this as external evidence? */
function adjudicatorWouldReject(exp) {
  // The external-session-zero adjudicator requires status=external_dataset,
  // dataset_origin non-synthetic external, and frozen preregistered predictions.
  // This export fails ALL of those by design => REJECTED (correct, honest channel).
  const reject =
    exp.status !== "external_dataset" ||
    exp.dataset_origin !== "external_dataset" ||
    exp.measurement_points.some((p) => typeof p.qicn_prediction !== "number");
  return reject;
}

function runReal(argv) {
  const runDir = (argv.find((a) => a.startsWith("--run-dir=")) || "").split("=")[1];
  const outArg = (argv.find((a) => a.startsWith("--out=")) || "").split("=")[1] ||
    "artifacts/bridge/g1_candidate_export.v1.json";
  if (!runDir) {
    console.error("[bridge:g1-export] ERROR: --run-dir=<episode artifact dir> required.");
    process.exit(1);
  }
  const dir = path.resolve(ROOT, runDir);
  const runHeader = readJson(path.join(dir, "run_header.json"));
  const runSummary = readJson(path.join(dir, "run_summary.json"));
  const admissibility = fs.existsSync(path.join(dir, "admissibility.json"))
    ? readJson(path.join(dir, "admissibility.json")) : null;

  const exp = buildExport({ runHeader, runSummary, admissibility });
  const { ok, errors } = validateExport(exp);
  const rejected = adjudicatorWouldReject(exp);

  const outPath = path.resolve(ROOT, outArg);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(exp, null, 2));

  console.log(`[bridge:g1-export] run=${exp.source_run.runId} points=${exp.measurement_points.length} -> ${outArg}`);
  console.log(`[bridge:g1-export] seal_valid=${ok} status=${exp.status} dataset_origin=${exp.dataset_origin}`);
  console.log(`[bridge:g1-export] adjudicator_would_reject=${rejected} (expected: true)`);
  if (!ok) {
    console.error("[bridge:g1-export] VALIDATION ERRORS:");
    errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  if (!rejected) {
    console.error("[bridge:g1-export] FAIL: export is NOT self-rejecting -> would masquerade as external. Aborting.");
    process.exit(1);
  }
  console.log("[bridge:g1-export] PASS: candidate export sealed, inadmissible-as-external, self-rejecting.");
  process.exit(0);
}

function selfTest() {
  let ok = true;
  const eq = (n, g, e) => { const p = JSON.stringify(g) === JSON.stringify(e); if (!p) { ok = false; console.error(`  FAIL ${n} got=${JSON.stringify(g)} exp=${JSON.stringify(e)}`); } else console.log(`  ok ${n}`); };

  const exp = buildExport({
    runHeader: { runId: "T1", versionHash: "v", lineage: { evidenceScope: "INTERNAL_SUPPORT_ONLY" } },
    runSummary: { endTime: "2026-06-23T00:00:00Z", ticks_hash: "h", metrics: { stasis_index: 0.16, identity_stability_score: 0.89, pmia: 0.15, predictive_consistency: 0.99, beth_q: 0.82, operational_determinism_score: 0.94 } },
    admissibility: { status: "PENDING_PR6C" }
  });
  eq("six_points", exp.measurement_points.length, 6);
  eq("status_not_external", exp.status, "NOT_EVALUABLE_RUNTIME_SELF_MEASUREMENT");
  eq("origin_internal", exp.dataset_origin, "runtime_internal_self_measurement");
  eq("observed_delta_mapped", exp.measurement_points[0].observed_delta, 0.16);
  eq("predictions_are_placeholders", typeof exp.measurement_points[0].qicn_prediction, "string");
  const v = validateExport(exp);
  eq("validate_ok", v.ok, true);
  eq("adjudicator_rejects", adjudicatorWouldReject(exp), true);

  // Negative: a fabricated prediction must fail validation
  const tampered = JSON.parse(JSON.stringify(exp));
  tampered.measurement_points[0].qicn_prediction = 0.42;
  eq("validate_catches_fabrication", validateExport(tampered).ok, false);

  // Negative: claiming external status must fail validation
  const tampered2 = JSON.parse(JSON.stringify(exp));
  tampered2.dataset_origin = "external_dataset";
  eq("validate_catches_external_claim", validateExport(tampered2).ok, false);

  console.log(ok ? "[bridge:g1-export] self-test PASS" : "[bridge:g1-export] self-test FAIL");
  process.exit(ok ? 0 : 1);
}

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) selfTest();
else runReal(argv);