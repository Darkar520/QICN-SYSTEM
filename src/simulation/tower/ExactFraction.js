/**
 * Exact rational arithmetic (BigInt-backed) and linear/polynomial algebra
 * for the QICN Writable Prefix Tower & Body-World Extension.
 *
 * Guarantees bit-for-bit mathematical equivalence with Python's `fractions.Fraction`
 * in `prefix_tower.py`, `body_world_tower.py`, and Frentes 1-5 verification suites,
 * while providing `.toFloat()` for real-time visualization and continuous telemetry.
 */

function gcdBigInt(a, b) {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}

function toBigIntExact(value) {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'boolean') return value ? 1n : 0n;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new TypeError(`ExactFraction requires integer or BigInt numerator/denominator, got ${value}`);
    }
    return BigInt(value);
  }
  if (typeof value === 'string') {
    return BigInt(value.trim());
  }
  throw new TypeError(`Cannot convert ${typeof value} to BigInt`);
}

export class Frac {
  constructor(num = 0n, den = 1n) {
    if (num instanceof Frac) {
      if (den instanceof Frac) {
        const n = num.n * den.d;
        const d = num.d * den.n;
        this._init(n, d);
        return;
      }
      const d = toBigIntExact(den);
      this._init(num.n, num.d * d);
      return;
    }
    if (den instanceof Frac) {
      const n = toBigIntExact(num);
      this._init(n * den.d, den.n);
      return;
    }
    if (typeof num === 'string' && num.includes('/') && den === 1n) {
      const [lhs, rhs] = num.split('/');
      this._init(toBigIntExact(lhs), toBigIntExact(rhs));
      return;
    }
    this._init(toBigIntExact(num), toBigIntExact(den));
  }

  _init(rawN, rawD) {
    if (rawD === 0n) {
      throw new RangeError('ExactFraction division by zero');
    }
    let n = rawN;
    let d = rawD;
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    if (n === 0n) {
      this.n = 0n;
      this.d = 1n;
    } else {
      const g = gcdBigInt(n, d);
      this.n = n / g;
      this.d = d / g;
    }
    Object.freeze(this);
  }

  get numerator() {
    return this.n;
  }

  get denominator() {
    return this.d;
  }

  isZero() {
    return this.n === 0n;
  }

  add(other) {
    const b = F(other);
    return new Frac(this.n * b.d + b.n * this.d, this.d * b.d);
  }

  sub(other) {
    const b = F(other);
    return new Frac(this.n * b.d - b.n * this.d, this.d * b.d);
  }

  mul(other) {
    const b = F(other);
    return new Frac(this.n * b.n, this.d * b.d);
  }

  div(other) {
    const b = F(other);
    if (b.n === 0n) throw new RangeError('ExactFraction division by zero');
    return new Frac(this.n * b.d, this.d * b.n);
  }

  neg() {
    return new Frac(-this.n, this.d);
  }

  abs() {
    return this.n < 0n ? new Frac(-this.n, this.d) : this;
  }

  /**
   * Exact modulo 1 in [0, 1), matching Python `x % 1` on `Fraction`.
   */
  mod1() {
    let rem = this.n % this.d;
    if (rem < 0n) rem += this.d;
    return new Frac(rem, this.d);
  }

  pow(exponent) {
    const exp = Number(exponent);
    if (!Number.isInteger(exp)) {
      throw new TypeError(`Exponent must be an integer, got ${exponent}`);
    }
    if (exp === 0) return ONE;
    if (exp > 0) {
      const e = BigInt(exp);
      return new Frac(this.n ** e, this.d ** e);
    }
    if (this.n === 0n) throw new RangeError('Zero cannot be raised to a negative power');
    const e = BigInt(-exp);
    return new Frac(this.d ** e, this.n ** e);
  }

  cmp(other) {
    const b = F(other);
    const diff = this.n * b.d - b.n * this.d;
    if (diff < 0n) return -1;
    if (diff > 0n) return 1;
    return 0;
  }

  eq(other) {
    const b = F(other);
    return this.n === b.n && this.d === b.d;
  }

  lt(other) {
    return this.cmp(other) < 0;
  }

  lte(other) {
    return this.cmp(other) <= 0;
  }

  gt(other) {
    return this.cmp(other) > 0;
  }

  gte(other) {
    return this.cmp(other) >= 0;
  }

  toFloat() {
    return Number(this.n) / Number(this.d);
  }

  toString() {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }

  toJSON() {
    return this.toString();
  }
}

export function F(num = 0n, den = 1n) {
  if (num instanceof Frac && den === 1n) return num;
  return new Frac(num, den);
}

export const ZERO = F(0);
export const ONE = F(1);
export const HALF = F(1, 2);

export function fMin(...values) {
  const flat = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
  if (flat.length === 0) throw new Error('fMin requires at least one value');
  let best = F(flat[0]);
  for (let i = 1; i < flat.length; i += 1) {
    const candidate = F(flat[i]);
    if (candidate.lt(best)) best = candidate;
  }
  return best;
}

export function fMax(...values) {
  const flat = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
  if (flat.length === 0) throw new Error('fMax requires at least one value');
  let best = F(flat[0]);
  for (let i = 1; i < flat.length; i += 1) {
    const candidate = F(flat[i]);
    if (candidate.gt(best)) best = candidate;
  }
  return best;
}

export function fSum(values, initial = ZERO) {
  let acc = F(initial);
  for (const val of values) {
    acc = acc.add(val);
  }
  return acc;
}

export function fProd(values, initial = ONE) {
  let acc = F(initial);
  for (const val of values) {
    acc = acc.mul(val);
  }
  return acc;
}

export function factorialBigInt(n) {
  const k = Number(n);
  if (k < 0 || !Number.isInteger(k)) throw new RangeError(`Invalid factorial argument: ${n}`);
  let res = 1n;
  for (let i = 2n; i <= BigInt(k); i += 1n) {
    res *= i;
  }
  return res;
}

export function combFrac(n, k) {
  const nn = Number(n);
  const kk = Number(k);
  if (kk < 0 || kk > nn) return ZERO;
  return F(factorialBigInt(nn), factorialBigInt(kk) * factorialBigInt(nn - kk));
}

// ============================================================================
// Exact Vector & Matrix Operations (matching body_world_tower.py & check_body_world.py)
// ============================================================================

export function vecAdd(a, b) {
  return Object.freeze(a.map((x, i) => F(x).add(b[i])));
}

export function vecSub(a, b) {
  return Object.freeze(a.map((x, i) => F(x).sub(b[i])));
}

export function vecScale(scalar, vector) {
  const s = F(scalar);
  return Object.freeze(vector.map((x) => s.mul(x)));
}

export function vecNormInf(vector) {
  if (!vector || vector.length === 0) return ZERO;
  return fMax(vector.map((x) => F(x).abs()));
}

export function vecEq(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((x, i) => F(x).eq(b[i]));
}

export function matVecMul(matrix, vector) {
  return Object.freeze(
    matrix.map((row) => fSum(row.map((a, i) => F(a).mul(vector[i]))))
  );
}

export function matMul(left, right) {
  const rightT = matTranspose(right);
  return Object.freeze(
    left.map((row) =>
      Object.freeze(
        rightT.map((col) => fSum(row.map((x, i) => F(x).mul(col[i]))))
      )
    )
  );
}

export function matTranspose(matrix) {
  if (!matrix.length) return Object.freeze([]);
  const cols = matrix[0].length;
  return Object.freeze(
    Array.from({ length: cols }, (_, c) =>
      Object.freeze(matrix.map((row) => F(row[c])))
    )
  );
}

export function matOperatorNormInf(matrix) {
  return fMax(matrix.map((row) => fSum(row.map((x) => F(x).abs()))));
}

export function matEq(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((row, i) => vecEq(row, right[i]));
}

export function matGap(left, right) {
  let worst = ZERO;
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < left[i].length; j += 1) {
      const d = F(left[i][j]).sub(right[i][j]).abs();
      if (d.gt(worst)) worst = d;
    }
  }
  return worst;
}

export function matRank(matrix) {
  const a = matrix.map((row) => row.map((x) => F(x)));
  const rows = a.length;
  const cols = a[0]?.length || 0;
  let pivot = 0;
  for (let col = 0; col < cols; col += 1) {
    let found = -1;
    for (let i = pivot; i < rows; i += 1) {
      if (!a[i][col].isZero()) {
        found = i;
        break;
      }
    }
    if (found === -1) continue;
    [a[pivot], a[found]] = [a[found], a[pivot]];
    const value = a[pivot][col];
    a[pivot] = a[pivot].map((x) => x.div(value));
    for (let i = 0; i < rows; i += 1) {
      if (i !== pivot) {
        const factor = a[i][col];
        a[i] = a[i].map((x, c) => x.sub(factor.mul(a[pivot][c])));
      }
    }
    pivot += 1;
    if (pivot === rows) break;
  }
  return pivot;
}

export function matDeterminant(matrix) {
  const n = matrix.length;
  const a = matrix.map((row) => row.map((x) => F(x)));
  let answer = ONE;
  for (let col = 0; col < n; col += 1) {
    let found = -1;
    for (let i = col; i < n; i += 1) {
      if (!a[i][col].isZero()) {
        found = i;
        break;
      }
    }
    if (found === -1) return ZERO;
    if (found !== col) {
      [a[col], a[found]] = [a[found], a[col]];
      answer = answer.neg();
    }
    const value = a[col][col];
    answer = answer.mul(value);
    a[col] = a[col].map((x) => x.div(value));
    for (let i = col + 1; i < n; i += 1) {
      const factor = a[i][col];
      a[i] = a[i].map((x, c) => x.sub(factor.mul(a[col][c])));
    }
  }
  return answer;
}

export function matInverse(matrix) {
  const n = matrix.length;
  const a = matrix.map((row, i) => [
    ...row.map((x) => F(x)),
    ...Array.from({ length: n }, (_, j) => (i === j ? ONE : ZERO))
  ]);
  for (let col = 0; col < n; col += 1) {
    let found = -1;
    for (let i = col; i < n; i += 1) {
      if (!a[i][col].isZero()) {
        found = i;
        break;
      }
    }
    if (found === -1) throw new Error('Matrix is singular in matInverse');
    [a[col], a[found]] = [a[found], a[col]];
    const value = a[col][col];
    a[col] = a[col].map((x) => x.div(value));
    for (let i = 0; i < n; i += 1) {
      if (i !== col) {
        const factor = a[i][col];
        a[i] = a[i].map((x, c) => x.sub(factor.mul(a[col][c])));
      }
    }
  }
  return Object.freeze(a.map((row) => Object.freeze(row.slice(n))));
}

// ============================================================================
// Exact Polynomial & Hermite Basis Algebra (matching check_body_world.py)
// ============================================================================

export function polyAdd(a, b) {
  const n = Math.max(a.length, b.length);
  return Object.freeze(
    Array.from({ length: n }, (_, i) =>
      (i < a.length ? F(a[i]) : ZERO).add(i < b.length ? F(b[i]) : ZERO)
    )
  );
}

export function polyScale(a, c) {
  const scalar = F(c);
  return Object.freeze(a.map((x) => scalar.mul(x)));
}

export function polyMul(a, b) {
  const c = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      c[i + j] = c[i + j].add(F(a[i]).mul(b[j]));
    }
  }
  return Object.freeze(c);
}

export function polyDerivative(a) {
  if (a.length <= 1) return Object.freeze([ZERO]);
  return Object.freeze(
    Array.from({ length: a.length - 1 }, (_, i) => F(i + 1).mul(a[i + 1]))
  );
}

export function polyValue(a, x) {
  const val = F(x);
  let sum = ZERO;
  for (let i = 0; i < a.length; i += 1) {
    sum = sum.add(F(a[i]).mul(val.pow(i)));
  }
  return sum;
}

export function hermiteBases(nodes) {
  return Object.freeze(
    nodes.map((nodeRaw) => {
      const node = F(nodeRaw);
      let lagrange = [ONE];
      for (const otherRaw of nodes) {
        const other = F(otherRaw);
        if (!other.eq(node)) {
          lagrange = polyScale(
            polyMul(lagrange, [other.neg(), ONE]),
            ONE.div(node.sub(other))
          );
        }
      }
      const square = polyMul(lagrange, lagrange);
      const slope = polyValue(polyDerivative(lagrange), node);
      const h = polyMul([ONE.add(F(2).mul(slope).mul(node)), F(-2).mul(slope)], square);
      const k = polyMul([node.neg(), ONE], square);
      return Object.freeze([h, k]);
    })
  );
}
