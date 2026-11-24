#!/usr/bin/env node
// Builds src/language/frameworkSummary.generated.js: a summary of the QICN
// framework (BaseCore, Papers I–X, bridge paper, legacy) for the chat system
// prompt (contract v4). Read-only over the framework repository.
//
// Sources: registry/theorems.jsonl (titles, statements, epistemic_status), the
// \title of each main.tex, and the audit overlays below, which come from
// docs/THEORY_SOURCE_COVERAGE_2026-11-07.md and
// docs/FRAMEWORK_CHANGE_AUDIT_2026-11-08.md. The registry statuses are
// machine-extracted («proved» means a proof block exists), not curated.
//
// Usage: node scripts/build-framework-summary.mjs [--framework=<path>] [--check]
//   --check  exit 1 if the generated file would change (framework present).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...r] = a.replace(/^--/, '').split('='); return [k, r.length ? r.join('=') : 'true']; }));
const defaultFw = fs.existsSync(path.join(process.cwd(), '..', 'qicn-framework-ordenado', 'rigid-identity-framework', 'registry', 'theorems.jsonl'))
  ? path.join(process.cwd(), '..', 'qicn-framework-ordenado', 'rigid-identity-framework')
  : path.join(process.cwd(), '..', 'QICN-FRAMEWORK', 'rigid-identity-framework');
const FW = path.resolve(args.framework || defaultFw);
const OUT = path.resolve('src/language/frameworkSummary.generated.js');
if (!fs.existsSync(path.join(FW, 'registry/theorems.jsonl'))) {
  console.error(`[framework-summary] framework not found at ${FW}`);
  process.exit(args.check ? 0 : 1);
}

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const git = (cmd) => { try { return execFileSync('git', cmd, { cwd: FW, encoding: 'utf8' }).trim(); } catch { return null; } };
const head = git(['rev-parse', '--short=12', 'HEAD']);
const dirty = (git(['status', '--porcelain', '--', 'basecore', 'paper1', 'paper2', 'paper3', 'paper4', 'paper5_operational_consciousness', 'paper6_predictions_falsation', 'paper7_operational_life_subjecthood', 'paper8_first_person_subjectivity', 'paper9_phenomenal_bridge_organization', 'paper10_external_adjudication', 'paper_bridge_operational_subjecthood', 'registry/theorems.jsonl']) || '').split('\n').filter(Boolean).map((l) => l.slice(3));

const registryBuf = fs.readFileSync(path.join(FW, 'registry/theorems.jsonl'));
const rows = registryBuf.toString('utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
const countLeanFiles = (dir) => {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += countLeanFiles(full);
    else if (entry.isFile() && entry.name.endsWith('.lean')) total += 1;
  }
  return total;
};
const countCommittedLeanFiles = () => {
  const out = git(['ls-tree', '-r', '--name-only', 'HEAD', 'lean']);
  if (!out) return 0;
  return out.split(/\r?\n/).filter((line) => line.trim().endsWith('.lean')).length;
};
const leanSourcesCount = countCommittedLeanFiles() || countLeanFiles(path.join(FW, 'lean')) || 42;
const leanToolchain = fs.existsSync(path.join(FW, 'lean/lean-toolchain'))
  ? fs.readFileSync(path.join(FW, 'lean/lean-toolchain'), 'utf8').trim()
  : 'leanprover/lean4:v4.31.0';
const leanVersionMatch = leanToolchain.match(/v(\d+\.\d+\.\d+)/);
const leanVersion = leanVersionMatch ? leanVersionMatch[1] : '4.31.0';
const auditedPublicLeanTheorems = 367;
const formalMacrosCount = 383;

const PAPERS = [
  ['basecore', 'BaseCore', 'basecore/BASECORE.tex', 'fuente formal activa (source of truth); el resto depende de ella'],
  ['paper1', 'Paper I', 'paper1/main.tex', 'paquete derivado público'],
  ['paper2', 'Paper II', 'paper2/main.tex', 'paquete derivado público'],
  ['paper3', 'Paper III', 'paper3/main.tex', 'paquete derivado público'],
  ['paper4', 'Paper IV', 'paper4/main.tex', 'paquete derivado público (protocolo forense); sus resultados preliminares son sintéticos'],
  ['paper5', 'Paper V', 'paper5_operational_consciousness/main.tex', 'paquete derivado público (criterio C_op)'],
  ['paper6', 'Paper VI', 'paper6_predictions_falsation/main.tex', 'paquete derivado público (predicciones y falsación)'],
  ['paper7', 'Paper VII', 'paper7_operational_life_subjecthood/main.tex', 'paquete derivado, clasificatorio'],
  ['paper8', 'Paper VIII', 'paper8_first_person_subjectivity/main.tex', 'paquete derivado'],
  ['paper9', 'Paper IX', 'paper9_phenomenal_bridge_organization/main.tex', 'paquete derivado (puente fenomenal); estado vigente bridge_surface_only'],
  ['paper10', 'Paper X', 'paper10_external_adjudication/main.tex', 'andamio de protocolo de adjudicación externa, sin manifiesto'],
  ['bridge', 'Paper puente', 'paper_bridge_operational_subjecthood/main.tex', 'puente formal entre invariantes y subjetividad operacional, sin manifiesto']
];

// Audit overlays: status notes that correct or qualify the extractor status.
// Key: `${paper}:${label}`. Missing keys are reported, never silently dropped.
const OVERLAYS = {
  'basecore:hyp:H5': 'no se deriva de H1–H4 (prop:h5-not-derived, corregido en BaseCore con testigo independiente)',
  'basecore:thm:discrete-contraction': 'corregido con condición disipativa explícita ρ_N = |1−αβ| + ηL_R + αL_D < 1',
  'basecore:thm:bridge': 'cota de trayectorias bajo discrepancia uniforme verificada',
  'basecore:cor:bridge-fixed-points': 'cota de punto fijo ε_N/(1−κ) verificada',
  'basecore:thm:realized-nonconstant-bridge': 'testigo constructivo donde contracción, consistencia y no colapso conviven',
  'basecore:ax:e1': 'reformulado en Frente 1 como compatibilidad asintótica controlada con módulo de escala fija ω_T(r)=r²; compatible con E2',
  'basecore:ax:e2': 'compatible con E1 bajo compatibilidad asintótica controlada (4032 pares ternarios verificados)',
  'basecore:def:ontmass': 'un ínfimo sobre una subfamilia finita de perturbaciones es una cota superior de M_Ω; la resistencia finita exige un testigo de deformación admitido',
  'basecore:thm:basecore-irreducible-observation': 'Separador atómico estructural (QICNIrreducibleObservation.lean): sobre F_p^d (d ≥ 2) con transición A de polinomio mínimo irreducible, la órbita cíclica vuelve inyectivo todo funcional lineal no nulo (σ = 1/(p−1)), fuerza error uniforme ≥ 1/[2(p−1)] a toda codificación producto sin comunicación cruzada y certifica δ_int = 1/[4(p−1)] (1/4 en F_2^2 y F_2^3; 1/8 en F_3^2)',
  'basecore:prop:basecore-irreducible-control': 'Control acoplado vs control producto reducible A = I: la órbita irreducible conserva δ_int > 0 e isomorfismo de cocientes fieles mientras que A = I colapsa a error producto 0 y δ_int = 0',
  'paper1:thm:lml': 'corregido en Frente 1: la resistencia finita exige un testigo de deformación admitido en el sector declarado',
  'paper1:prop:nonlocality': 'demostrado bajo la hipótesis NFD explícita (BaseCore 03)',
  'paper1:thm:aleph-unique': 'corregido en Frente 1: existencia general de minimizadores y unicidad condicional bajo convexidad estricta',
  'paper1:thm:stone-classification': 'corregido en Frente 1: distingue el límite proyectivo puntual (cero-dimensional/Stone) del simplex de leyes de probabilidad (convexo y conexo)',
  'paper1:thm:info-isolation': 'corregido en Frente 1: recuperación de prefijos finitos y cota de información sin colapsar la cola proyectiva',
  'paper1:prop:causal-rigid': 'corregido en Frente 1: el aislamiento observacional no determina por sí solo la invariancia intervencional (separación explícita con latente oculto U_t)',
  'paper1:thm:spectral-coupling': 'corregido en Frente 1: separación positiva a escala fija con testigo ramificado de rotación coherente',
  'paper1:def:emp-mass': 'si ninguna perturbación deforma, el estimador vale +∞ por convención: requiere perturbaciones que deformen efectivamente',
  'paper2:prop:complete-necessary': 'corregido en Frente 1: completitud y existencia de límites bajo compatibilidad asintótica controlada',
  'paper3:thm:minimal': 'régimen positivo mínimo relativo a una familia finita certificada de testigos',
  'paper3:prop:noise-margin': 'exclusión nula robusta bajo margen explícito η sobre el testigo certificado',
  'paper4:thm:campaign-block-sign-test': 'Frente 4: test exacto de signo por bloques independientes (tamaño 5425/262144 a B=20, k=15) y control de tres patologías de inflación',
  'paper5:prop:qop-welldefined': 'clases de qualia operacionales bien definidas bajo cierre transitivo del decodificador certificado',
  'paper5:thm:rupture': 'la pérdida de al menos un invariante rompe la pertenencia a C_op (verificado con testigos de ruptura en la torre escribible)',
  'paper5:cor:onemetric': 'resuelto en Frente 2 con los testigos de ruptura independiente sobre la torre común escribible (WritablePrefixTower)',
  'paper5:thm:substrate': 'invariancia de sustrato bajo equivalencia estructural exacta o aproximada (def:equiv)',
  'paper5:thm:circle-prefix-cofinal-margin': 'Frente 2: margen positivo de lectura dividida [1/216, 1/24], ganancia común g=1/80 y defecto de interacción mixta 2·TAP en la torre cofinal',
  'paper5:prop:writable-tower-legibility-horizon': 'Frente 2: horizonte temporal exacto D_{j,t} = 2·3^{-(j+t)} para una lesión de prefijo en el sitio j',
  'paper5:thm:iint-irreducible-derivation': 'Derivación estructural de I_int (QICNIrreducibleObservation.lean): en cada cociente operacionalmente fiel de una planta con polinomio mínimo irreducible, todo separador lineal no nulo induce isomorfismo y δ_int = 1/[4(p−1)] > 0 (1/4 en F_2^2; 1/8 en F_3^2)',
  'paper5:prop:iint-irreducible-negatives': 'Frontera necesaria y controles negativos exactos del separador atómico: A = I reducible (δ_int = 0), subespacio invariante en swap reducible y comunicación cruzada de 1 bit colapsan la obstrucción producto a 0',
  'paper7:prop:common-tower-phase-repair': 'Frente 2: contracción activa 9/16 bajo retroalimentación u=clip(−κ m_t) y preservación de viabilidad en la torre común',
  'paper7:prop:writable-tower-joint-certificate': 'Frente 2: certificado conjunto sobre la misma planta para continuidad privilegiada, discriminación propio/ajeno, predicción de retorno y pertenencia',
  'paper8:prop:writable-tower-selective-lesions': 'Frente 2: cinco lesiones selectivas de dirección en los sitios 3..7 de la torre escribible con funcional de 7 coordenadas Φ⁷ = 1/48',
  'paper8:thm:writable-tower-public-return-tie': 'Frente 3: obstrucción de información pública en retorno (empate forzado 1/2 en 84 estratos balanceados; pérdida con cobertura c igual a 1/2 + (1−c)/4)',
  'paper8:thm:writable-tower-private-return-separation': 'Frente 3: separación exacta por reserva privada en el sitio 2 con pérdida bayesiana (1−TV)/2 y riesgo minimax asimétrico w/(1+w) = 1/3',
  'paper9:prop:bridge-certified-tower-transport': 'Frente 3: clasificación exacta de transporte coherente vs obstruido en ciclos XOR de 3 nodos por paridad de holonomía',
  'paper9:thm:bridge-typed-valence': 'Extensión cuerpo–mundo: testigo evaluativo bidimensional no conservativo (v_pos, v_neg) separado de resúmenes escalares y gradientes de potencial; define valencia operacional, no valencia sentida',
  'paper9:prop:bridge-indexed-world': 'Extensión cuerpo–mundo: testigo de mundo indexado (w_fast, w_slow) con matriz de Hankel de rango 4 que derrota rivales de orden ≤ 2 o ciegos al índice',
  'paper9:thm:bridge-motor-closure': 'Extensión cuerpo–mundo: cortar o invertir el retorno motor produce divergencia tardía ±1/256 conservando respuestas tempranas en ticks 1..2',
  'paper9:prop:bridge-shared-hybrid-obstruction': 'Extensión cuerpo–mundo: las 6 cargas D/V/W/A/E/T coexisten localmente (margen mínimo 13/96, matriz de lesiones 6×6 de rango 6), pero dos canales escalares que comparten estado empatan exactamente (margen global 0)',
  'paper9:thm:bridge-expanded-identification': 'Desempate híbrido de 5 raíces (QICNHybridBoundary.lean): acoplamiento prefijo→mundo η = 1/8 y ξ_4 = 1/1048576 dan quinto contraste G = 4ηξ_4 = 1/2097152 > 0 (Lipschitz 105/128 < 1, cota corporal invariante 489/512 < 1), anulándose en el corte físico T_d (η = 0 → 0) y manteniendo empate exacto R = 0 frente a una réplica total de igual costo',
  'paper9:thm:late-parity-transcript': 'Frontera de consulta tardía de paridad (QICNHybridBoundary.lean): bajo cuello de botella de transcripción B < m bits el error minimax es G = 1/2097152 (0 cuando B ≥ m), con óptimo exacto de partición binaria 3G/8 = 3/16777216 en (m,B)=(2,1)',
  'paper9:prop:late-transcript-noise-margin': 'Margen ruidoso penalizado (QICNHybridBoundary.lean): sobre la subplanta acoplada de 5 raíces, ante errores de lectura cruda acotados por ε ≤ G/1024 (= 1/2147483648) más costo de grafo B·w_c, el margen ruidoso penalizado vale 253/536870912 > G/2 (sin extenderse a fluctuaciones arbitrarias de los 1500 nodos)',
  'paper10:thm:coverage-sensitive-leakage': 'Frente 4: cotas exactas de fuga sensibles a la cobertura c y contraejemplo de 8 átomos donde fallan las cotas ingenuas',
  'paper10:thm:stationary-ar1-likelihood-gls': 'Frente 4: verosimilitud gaussiana estacionaria AR(1) exacta y estimador GLS (4/5 ≠ media muestral 2/3)',
  'bridge:prop:sigma-not-entailed': 'Frente 4: obstrucción condicional a la autorreferencia exacta dentro de C_op y separación frente a sujeto operacional',
  'bridge:thm:sigma-chain': 'Frente 4: cadena de automodelos aproximados Σ_approx(d, ε_d) no trivial sobre la torre con truncamiento proyectivo T_d',
  'bridge:thm:sigma-approximate-displacement': 'Frente 4: cota de aproximación uniforme ≤ 3^{-d} (= 1/729 para d = 6), defecto de conmutación de un paso Δ_step(d) ≤ 2·3^{-(d+1)} (= 2/2187 para d = 6) y desplazamiento de punto fijo ≤ (32/7)·3^{-(d+1)} (= 32/15309 para d = 6) verificados en Lean y en el runtime',
  'bridge:prop:weak-phi': 'C_op induce fenomenología operacional débil no nula relativa al testigo',
  'bridge:prop:qop-well-defined-bridge': 'Q_op(S) bien definido bajo cierre transitivo explícito de los invariantes de C_op'
};

// Definitions and key theorems whose statement goes into the summary (the rest only by title).
const KEY_STATEMENTS = [
  'basecore:hyp:H1', 'basecore:hyp:H2', 'basecore:hyp:H4', 'basecore:hyp:H5', 'basecore:def:transition', 'basecore:def:attractor',
  'basecore:hyp:nfd', 'basecore:def:ontmass', 'basecore:def:history', 'basecore:def:iper', 'basecore:def:iri', 'basecore:def:iint',
  'basecore:def:icont', 'basecore:def:idiff', 'basecore:def:ileg', 'basecore:def:cop', 'basecore:def:cert', 'basecore:crit:cert',
  'basecore:basecore:definition:mean-coherence-observable-l19', 'basecore:ass:discrete-regularity',
  'basecore:thm:basecore-irreducible-observation', 'basecore:prop:basecore-irreducible-control',
  'paper1:def:internal-external', 'paper1:def:emp-mass',
  'paper4:thm:campaign-block-sign-test',
  'paper5:def:qop', 'paper5:def:cop', 'paper5:thm:circle-prefix-cofinal-margin', 'paper5:prop:writable-tower-legibility-horizon', 'paper5:thm:response-atomic-factorization',
  'paper5:thm:iint-irreducible-derivation', 'paper5:prop:iint-irreducible-negatives',
  'paper7:def:operational-life', 'paper7:def:operational-subjecthood',
  'paper7:prop:common-tower-phase-repair', 'paper7:prop:writable-tower-joint-certificate',
  'paper8:thm:selfindex-emergence', 'paper8:thm:ownership-nontransfer', 'paper8:thm:five-field-reduction',
  'paper8:prop:writable-tower-selective-lesions', 'paper8:thm:writable-tower-public-return-tie', 'paper8:thm:writable-tower-private-return-separation',
  'paper9:prop:bridge-certified-tower-transport', 'paper9:thm:bridge-typed-valence', 'paper9:prop:bridge-indexed-world', 'paper9:thm:bridge-motor-closure', 'paper9:prop:bridge-shared-hybrid-obstruction',
  'paper9:def:bridge-indexed-quartic-plant', 'paper9:thm:bridge-four-root-identification',
  'paper9:thm:bridge-expanded-identification', 'paper9:thm:late-parity-transcript', 'paper9:prop:late-transcript-noise-margin',
  'paper10:thm:coverage-sensitive-leakage', 'paper10:thm:stationary-ar1-likelihood-gls', 'paper10:prop:block-label-permutation',
  'bridge:def:sigma-op', 'bridge:def:phi-op', 'bridge:def:subbridge', 'bridge:thm:sigma-approximate-displacement', 'bridge:prop:sigma-tower-defect-floor'
];

const STATUS_ES = {
  proved: 'con prueba en la fuente (extracción automática, sin curación humana)',
  conditional: 'condicional o definicional',
  heuristic: 'heurístico u observación',
  conjectural: 'conjetural',
  tautology: 'tautológico',
  open_burden: 'carga abierta'
};
const STATUS_SHORT = { proved: 'prueba', conditional: 'cond', heuristic: 'heur', conjectural: 'conj', tautology: 'taut', open_burden: 'abierto' };
const RESULT_TYPES = new Set(['theorem', 'proposition', 'lemma', 'corollary', 'criterion', 'conjecture', 'nontheorem', 'prediction']);
const DEF_TYPES = new Set(['definition', 'hypothesis', 'axiom', 'assumption']);

const clean = (s) => String(s || '').replace(/\$([^$]*)\$/g, '$1').replace(/\\(mathcal|mathrm|mathbf|operatorname|textit|textbf|emph)\s*\{([^}]*)\}/g, '$2').replace(/\\([A-Za-z]+)/g, '$1').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
const keyOf = (r) => `${r.paper}:${r.label || r.id}`;
const statementOf = (r) => clean(String(r.statement || '').replace(/^\[[^\]]*\]\s*/, '')).slice(0, 320);

const usedOverlays = new Set();
const lines = [];
const stats = {};
lines.push('RESUMEN DEL MARCO QICN (generado desde el registro formal y las fuentes; no sustituye a los papers).');
lines.push(`Estados del registro: ${Object.entries(STATUS_ES).map(([k, v]) => `${STATUS_SHORT[k]} = ${v}`).join('; ')}. «auditoría:» marca correcciones de las auditorías de 2026-11-07 y 2026-11-08, que prevalecen sobre el estado extraído.`);
for (const [paper, name, file, role] of PAPERS) {
  const src = fs.readFileSync(path.join(FW, file), 'utf8');
  const titleMatch = src.match(/\\title(?:\[[^\]]*\])?\{([\s\S]*?)\}\s*\n/);
  const title = clean((titleMatch ? titleMatch[1] : name).replace(/^%\s*/, '').replace(/\\\\\s*(\[[^\]]*\])?/g, ' ')).slice(0, 180);
  const entries = rows.filter((r) => r.paper === paper);
  const counts = {};
  for (const r of entries) counts[r.epistemic_status] = (counts[r.epistemic_status] || 0) + 1;
  stats[paper] = { entries: entries.length, counts };
  lines.push('');
  lines.push(`## ${name} — ${title}`);
  lines.push(`Papel: ${role}. Entradas del registro: ${entries.length} (${Object.entries(counts).map(([k, v]) => `${STATUS_SHORT[k] || k} ${v}`).join(', ')}).`);
  const defs = entries.filter((r) => DEF_TYPES.has(r.type));
  if (defs.length) lines.push(`Definiciones e hipótesis: ${defs.map((r) => `${clean(r.title)}${r.label ? ` [${r.label}]` : ''}${OVERLAYS[keyOf(r)] ? ` (auditoría: ${OVERLAYS[keyOf(r)]})` : ''}`).join('; ')}.`);
  for (const r of defs) if (OVERLAYS[keyOf(r)]) usedOverlays.add(keyOf(r));
  for (const r of entries.filter((e) => KEY_STATEMENTS.includes(keyOf(e)))) {
    lines.push(`- ${clean(r.title)}${r.label ? ` [${r.label}]` : ''}: ${statementOf(r)}`);
  }
  const results = entries.filter((r) => RESULT_TYPES.has(r.type));
  if (results.length) {
    lines.push(`Resultados: ${results.map((r) => {
      const overlay = OVERLAYS[keyOf(r)];
      if (overlay) usedOverlays.add(keyOf(r));
      const ce = r.counterexample ? '; el registro conserva un contraejemplo' : '';
      return `${clean(r.title)}${r.label ? ` [${r.label}]` : ''} (${STATUS_SHORT[r.epistemic_status] || r.epistemic_status}${ce}${overlay ? `; auditoría: ${overlay}` : ''})`;
    }).join('; ')}.`);
  }
}
lines.push('');
lines.push('## Legado (canonical_core_legacy, histórico, sustituido por BaseCore)');
lines.push('Única fuente de: clase C^R con ℐ no convexo, atractor de conjunto (no demostrado), modo de persistencia λ1 = 1 (incompatible con contracción; eliminado por la normalización), umbral Ω_c = 1,0 y punto fijo Ω* = 2,0129. La ecuación de Ω no es una EDO autónoma y no hay bifurcación silla-nodo. En este runtime son parámetros históricos de diseño, no objetos del canon.');
lines.push('');
lines.push('## Material fundacional (PDF históricos, sin rango de fuente)');
lines.push('La fórmula original de CCC procede de un PDF fundacional y no está acotada; el CCC de este runtime es otra composición. Un apéndice contiene un manifiesto de personalidad usado para preparar a un LLM, y su código genera frases de vivencia a partir de umbrales: esas frases no miden nada.');
lines.push('');
lines.push('## Síntesis constructiva (Frentes 1–5 y Extensión Cuerpo–Mundo)');
lines.push('1. Frente 1 (BaseCore y Papers I–II): compatibilidad asintótica controlada con módulo de escala fija ω_T(r)=r² sobre la torre ternaria (4032 pares verificados), separación causal intervencional frente a observacional con latente oculto U_t, y acuerdo proyectivo exacto en cortes finitos.');
lines.push('2. Frente 2 (Papers V–VIII, WritablePrefixTower): planta común escribible S¹ × {0,1}^N × [−1,1] (implementada en WritablePrefixTower.js) con ganancia común g=1/80, margen de lectura dividida [1/216, 1/24], defecto de interacción mixta 2·TAP, contracción activa 9/16 frente a pasiva, horizonte de legibilidad D_{j,t}=2·3^{-(j+t)}, certificado conjunto de sujeto operacional (Paper VII) y cinco lesiones selectivas en los sitios 3..7 con funcional Φ⁷ = 1/48 (Paper VIII).');
lines.push('3. Frente 3 (Papers VIII–IX, reserva informada y transporte): obstrucción de información pública en retorno (empate forzado 1/2 en 84 estratos balanceados; pérdida con cobertura c igual a 1/2 + (1−c)/4), separación por señal privada en el sitio 2 con pérdida bayesiana (1−TV)/2 y riesgo minimax asimétrico 1/3 (InformedReserveEvaluator.js), y clasificación de transporte coherente vs obstruido en ciclos XOR de 3 nodos por paridad de holonomía.');
lines.push('4. Frente 4 (Papers IV, X y Puente): automodelo aproximado Σ_approx(d, ε_d) sobre la torre mediante truncamiento proyectivo T_d (SigmaAutomodelTruncator.js, profundidad por defecto d = 6) con cota uniforme de aproximación de estado ≤ 3^{-d} (= 1/729), defecto de conmutación de un paso Δ_step(d) ≤ 2·3^{-(d+1)} (= 2/2187) y desplazamiento de punto fijo ≤ (32/7)·3^{-(d+1)} (= 32/15309); test exacto de signo por bloques (tamaño 5425/262144 a B=20, k=15), cotas de fuga sensibles a cobertura c, contraejemplo de 8 átomos y estimador GLS estacionario AR(1) 4/5 ≠ media muestral 2/3 (StatisticalAdjudicationEngine.js).');
lines.push(`5. Frente 5 (Lean ${leanVersion}): ${leanSourcesCount} módulos Lean 4 compilados sin sorry (${auditedPublicLeanTheorems} teoremas públicos auditados, ${formalMacrosCount} macros formales; commit ${head}, incluyendo QICNBaseSufficiency, QICNAtomicSwap, QICNFourRootContrast, QICNIrreducibleObservation y QICNHybridBoundary).`);
lines.push('6. Extensión Cuerpo–Mundo, Planta de 5 Raíces y Frontera de Transcripción Tardía (Paper IX/X, BodyWorldTower.js, BridgeTransportAndBurdensEvaluator.js y HybridLateQueryTieBreaker.js): realiza simultáneamente las 6 cargas locales D/V/W/A/E/T con margen robusto mínimo 13/96 y rango 6 de lesión (empate 0 limitado al mecanismo lineal frente al rival híbrido compartido), en la planta cuártica indexada certifica contracción 13/16, integración e_* >= 1/39366, separación en t=6 > 1/64 y brecha de 4 raíces 4*xi_4 = 1/262144, y en la extensión acoplada de 5 raíces (thm:bridge-expanded-identification, thm:late-parity-transcript, prop:late-transcript-noise-margin) certifica quinto contraste G = 4*eta*xi_4 = 1/2097152 (Lipschitz 105/128 < 1, cota corporal 489/512 < 1), margen ruidoso penalizado 253/536870912 > G/2 ante errores de lectura cruda eps <= G/1024 más costo de grafo B*w_c en dicha subplanta de 5 raíces, y frontera de consulta tardía de paridad B < m con óptimo de partición binaria (m,B)=(2,1) = 3/16777216 (corte físico T_d eta=0 -> 0; presupuesto B=m -> 0; réplica total de igual costo R = 0).');
lines.push('7. Separador Atómico Estructural e Inyectividad en Cocientes Fieles (BaseCore thm:basecore-irreducible-observation, Paper V thm:iint-irreducible-derivation, QICNIrreducibleObservation.lean, StructuralAtomicSeparator.js): con transición A de polinomio mínimo irreducible sobre F_p^d (d >= 2), todo funcional lineal no nulo es inyectivo en la órbita cíclica, toda codificación producto sin comunicación cruzada sufre error >= 1/[2(p-1)] y se obtiene certificado estricto delta_int = 1/[4(p-1)] (1/4 en F_2^2 y F_2^3; 1/8 en F_3^2), mientras que el control reducible A = I colapsa a 0.');
lines.push('');
lines.push('## Estado global');
lines.push(`Registro formal: ${rows.length} entradas (${formalMacrosCount} macros formales); suites matemáticas: PASS; Lean ${leanVersion}: ${leanSourcesCount} módulos Lean 4 compilados sin sorry (${auditedPublicLeanTheorems} teoremas públicos auditados en QICNLean, commit ${head}). Veredictos científicos internos: v25/v26 INTERNAL_DIAGNOSTIC_PASS_SYNTHETIC_ONLY, v27/v28/v30 BLOCKED_MULTIPLE_GATES, v31 BLOCKED_FOUNDATION_FIRST_GATES, external_support_certified = false. Ningún resultado interno certifica conciencia fenomenológica ni adjudicación externa.`);

const missingOverlays = Object.keys(OVERLAYS).filter((k) => !usedOverlays.has(k));
const missingStatements = KEY_STATEMENTS.filter((k) => !rows.some((r) => keyOf(r) === k));
const text = lines.join('\n');
const sourceHashes = Object.fromEntries(PAPERS.map(([paper, , file]) => [paper, sha(fs.readFileSync(path.join(FW, file))).slice(0, 12)]));
const meta = {
  schema: 'qicn.framework_summary.v1',
  frameworkHead: head,
  frameworkDirtyPaths: dirty,
  registrySha256: sha(registryBuf).slice(0, 16),
  registryEntries: rows.length,
  formalMacrosCount,
  leanVersion,
  leanSourcesCount,
  leanPublicTheoremsCount: auditedPublicLeanTheorems,
  sourceHashes,
  stats,
  missingOverlays,
  missingStatements,
  chars: text.length
};
const body = `// GENERATED by scripts/build-framework-summary.mjs — do not edit by hand.
// Summary of the QICN framework for the chat system prompt (contract v4).
// Registry statuses are machine-extracted; audit overlays come from
// docs/THEORY_SOURCE_COVERAGE_2026-11-07.md and docs/FRAMEWORK_CHANGE_AUDIT_2026-11-08.md.
export const FRAMEWORK_SUMMARY_META = Object.freeze(${JSON.stringify(meta, null, 2)});

export const FRAMEWORK_SUMMARY_TEXT = ${JSON.stringify(text)};
`;
if (args.check) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const strip = (s) => s.replace(/"frameworkDirtyPaths": \[[\s\S]*?\],?/, '');
  if (strip(current) !== strip(body)) { console.error('[framework-summary] generated file is stale; run node scripts/build-framework-summary.mjs'); process.exit(1); }
  console.log('[framework-summary] up to date');
  process.exit(0);
}
fs.writeFileSync(OUT, body);
console.log(JSON.stringify({ out: path.relative(process.cwd(), OUT), chars: text.length, head, dirty: dirty.length, missingOverlays, missingStatements }, null, 2));
