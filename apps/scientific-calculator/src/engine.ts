export class CalcError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalcError";
  }
}

export type CalcValue = Rational | number;

const SNAP_GRID = 1_000_000_000n;
const MAX_HISTORY = 50;

function gcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left === 0n ? 1n : left;
}

export class Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;

  constructor(numerator: bigint, denominator = 1n) {
    if (denominator === 0n) throw new CalcError("除数不能为零");
    const sign = denominator < 0n ? -1n : 1n;
    const divisor = gcd(numerator, denominator);
    this.numerator = (numerator * sign) / divisor;
    this.denominator = (denominator * sign) / divisor;
  }

  static fromDecimal(integerPart: string, fractionalPart: string): Rational {
    const scale = 10n ** BigInt(fractionalPart.length);
    return new Rational(BigInt(integerPart || "0") * scale + BigInt(fractionalPart || "0"), scale);
  }

  add(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator - other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  multiply(other: Rational): Rational {
    return new Rational(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  divide(other: Rational): Rational {
    if (other.numerator === 0n) throw new CalcError("除数不能为零");
    return new Rational(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  modulo(other: Rational): Rational {
    if (other.numerator === 0n) throw new CalcError("除数不能为零");
    const quotient = this.divide(other);
    const floor = quotient.floor();
    return this.subtract(other.multiply(new Rational(floor)));
  }

  pow(exponent: Rational): Rational {
    if (exponent.denominator !== 1n) {
      throw new CalcError("指数必须为整数");
    }
    if (exponent.numerator === 0n) return new Rational(1n);
    if (exponent.numerator < 0n) return new Rational(1n).divide(this.pow(new Rational(-exponent.numerator)));
    let result = new Rational(1n);
    let base: Rational = this;
    let power = exponent.numerator;
    while (power > 0n) {
      if (power & 1n) result = result.multiply(base);
      base = base.multiply(base);
      power >>= 1n;
    }
    return result;
  }

  floor(): bigint {
    const quotient = this.numerator / this.denominator;
    const remainder = this.numerator % this.denominator;
    return remainder < 0n ? quotient - 1n : quotient;
  }

  toNumber(): number {
    return Number(this.numerator) / Number(this.denominator);
  }

  isInteger(): boolean {
    return this.denominator === 1n;
  }

  toString(): string {
    return this.denominator === 1n ? this.numerator.toString() : `${this.numerator}/${this.denominator}`;
  }
}

function toNumber(value: CalcValue): number {
  return value instanceof Rational ? value.toNumber() : value;
}

function normalizeValue(value: CalcValue): CalcValue {
  if (!(value instanceof Rational) || !value.isInteger()) return value;
  return Number(value.numerator);
}

function addValues(left: CalcValue, right: CalcValue): CalcValue {
  if (left instanceof Rational && right instanceof Rational) return left.add(right);
  return toNumber(left) + toNumber(right);
}

function subtractValues(left: CalcValue, right: CalcValue): CalcValue {
  if (left instanceof Rational && right instanceof Rational) return left.subtract(right);
  return toNumber(left) - toNumber(right);
}

function multiplyValues(left: CalcValue, right: CalcValue): CalcValue {
  if (left instanceof Rational && right instanceof Rational) return left.multiply(right);
  return toNumber(left) * toNumber(right);
}

function divideValues(left: CalcValue, right: CalcValue): CalcValue {
  if (right instanceof Rational && right.numerator === 0n) throw new CalcError("除数不能为零");
  if (left instanceof Rational && right instanceof Rational) return left.divide(right);
  const divisor = toNumber(right);
  if (divisor === 0) throw new CalcError("除数不能为零");
  return toNumber(left) / divisor;
}

function moduloValues(left: CalcValue, right: CalcValue): CalcValue {
  if (left instanceof Rational && right instanceof Rational) return left.modulo(right);
  const divisor = toNumber(right);
  if (divisor === 0) throw new CalcError("除数不能为零");
  return ((toNumber(left) % divisor) + divisor) % divisor;
}

function powValues(base: CalcValue, exponent: CalcValue): CalcValue {
  if (base instanceof Rational && exponent instanceof Rational && exponent.isInteger()) {
    if (base.numerator === 0n && exponent.numerator < 0n) throw new CalcError("除数不能为零");
    return base.pow(exponent);
  }
  return toNumber(base) ** toNumber(exponent);
}

function negateValue(value: CalcValue): CalcValue {
  return value instanceof Rational
    ? new Rational(-value.numerator, value.denominator)
    : -value;
}

function absValue(value: CalcValue): CalcValue {
  if (value instanceof Rational) {
    return new Rational(value.numerator < 0n ? -value.numerator : value.numerator, value.denominator);
  }
  return Math.abs(value);
}

function snapNumber(value: number): CalcValue {
  if (!Number.isFinite(value)) throw new CalcError("超出函数定义域");
  const nearest = Math.round(value);
  return Math.abs(value - nearest) < 1e-9 ? nearest : value;
}

function formatGeneral(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  if (exponent < -4 || exponent >= 10) {
    const [mantissa, exponentPart = "+0"] = value.toExponential(9).split("e");
    const trimmed = (mantissa ?? "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    const match = /^([+-])(\d+)$/.exec(exponentPart);
    const sign = match?.[1] ?? "+";
    const digits = match?.[2] ?? "0";
    return `${trimmed}e${sign}${digits.padStart(2, "0")}`;
  }
  return value.toPrecision(10).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

export function formatValue(value: CalcValue): string {
  if (value instanceof Rational) {
    return value.isInteger() ? value.numerator.toString() : formatGeneral(value.toNumber());
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : formatGeneral(value);
  }
  return String(value);
}

type Token =
  | { kind: "num"; value: Rational }
  | { kind: "id"; value: string }
  | { kind: "op"; value: string };

const CONSTANTS: Record<string, number> = {
  "π": Math.PI,
  pi: Math.PI,
  e: Math.E,
};

const FUNCTIONS = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "ln", "log", "sqrt", "abs"]);

class Lexer {
  readonly tokens: Token[] = [];
  readonly #source: string;
  #position = 0;

  constructor(source: string) {
    this.#source = source;
    this.#scan();
  }

  #scan(): void {
    while (this.#position < this.#source.length) {
      const character = this.#source[this.#position]!;
      if (/\s/.test(character)) {
        this.#position += 1;
      } else if (/[0-9]/.test(character)) {
        this.#scanNumber();
      } else if (character === ".") {
        this.#scanDotNumber();
      } else if (character === "π") {
        this.tokens.push({ kind: "id", value: "π" });
        this.#position += 1;
      } else if (/[A-Za-z]/.test(character)) {
        this.#scanIdentifier();
      } else if ("+-*/^%()".includes(character)) {
        this.tokens.push({ kind: "op", value: character });
        this.#position += 1;
      } else {
        throw new CalcError("无法解析的表达式");
      }
    }
  }

  #scanNumber(): void {
    const start = this.#position;
    while (this.#position < this.#source.length && /[0-9]/.test(this.#source[this.#position]!)) {
      this.#position += 1;
    }
    const integerPart = this.#source.slice(start, this.#position);
    if (
      this.#source[this.#position] === "." &&
      /[0-9]/.test(this.#source[this.#position + 1] ?? "")
    ) {
      this.#position += 1;
      const fractionStart = this.#position;
      while (
        this.#position < this.#source.length &&
        /[0-9]/.test(this.#source[this.#position]!)
      ) {
        this.#position += 1;
      }
      const fractionPart = this.#source.slice(fractionStart, this.#position);
      this.tokens.push({ kind: "num", value: Rational.fromDecimal(integerPart, fractionPart) });
      return;
    }
    this.tokens.push({ kind: "num", value: new Rational(BigInt(integerPart)) });
  }

  #scanDotNumber(): void {
    this.#position += 1;
    const start = this.#position;
    while (this.#position < this.#source.length && /[0-9]/.test(this.#source[this.#position]!)) {
      this.#position += 1;
    }
    const fraction = this.#source.slice(start, this.#position);
    if (!fraction) throw new CalcError("无法解析的表达式");
    this.tokens.push({ kind: "num", value: Rational.fromDecimal("0", fraction) });
  }

  #scanIdentifier(): void {
    const start = this.#position;
    while (
      this.#position < this.#source.length && /[A-Za-z]/.test(this.#source[this.#position]!)
    ) {
      this.#position += 1;
    }
    this.tokens.push({ kind: "id", value: this.#source.slice(start, this.#position) });
  }
}

class Parser {
  readonly #tokens: Token[];
  readonly #mode: "rad" | "deg";
  #position = 0;

  constructor(tokens: Token[], mode: "rad" | "deg") {
    this.#tokens = tokens;
    this.#mode = mode;
  }

  parse(): CalcValue {
    const value = this.#expression();
    if (!this.#atEnd()) throw new CalcError("无法解析的表达式");
    return value;
  }

  #expression(): CalcValue {
    let value = this.#term();
    for (let operator = this.#matchOp("+", "-"); operator; operator = this.#matchOp("+", "-")) {
      const right = this.#term();
      value = operator === "+" ? addValues(value, right) : subtractValues(value, right);
    }
    return value;
  }

  #term(): CalcValue {
    let value = this.#unary();
    for (let operator = this.#matchOp("*", "/", "%"); operator; operator = this.#matchOp("*", "/", "%")) {
      const right = this.#unary();
      value =
        operator === "*"
          ? multiplyValues(value, right)
          : operator === "/"
            ? divideValues(value, right)
            : moduloValues(value, right);
    }
    return value;
  }

  #unary(): CalcValue {
    if (this.#matchOp("-")) return negateValue(this.#unary());
    return this.#power();
  }

  #power(): CalcValue {
    const base = this.#primary();
    if (!this.#matchOp("^")) return base;
    return powValues(base, this.#unary());
  }

  #primary(): CalcValue {
    const number = this.#matchNumber();
    if (number) return number;
    if (this.#matchOp("(")) {
      const value = this.#expression();
      if (!this.#matchOp(")")) throw new CalcError("无法解析的表达式");
      return value;
    }
    const identifier = this.#matchIdentifier();
    if (identifier) {
      if (this.#matchOp("(")) {
        const argument = this.#expression();
        if (!this.#matchOp(")")) throw new CalcError("无法解析的表达式");
        return this.#function(identifier, argument);
      }
      if (Object.hasOwn(CONSTANTS, identifier)) return CONSTANTS[identifier]!;
      throw new CalcError(`未知常量 ${identifier}`);
    }
    throw new CalcError("无法解析的表达式");
  }

  #function(name: string, argument: CalcValue): CalcValue {
    if (!FUNCTIONS.has(name)) throw new CalcError(`未知函数 ${name}`);
    switch (name) {
      case "sin":
      case "cos":
      case "tan": {
        let radians = toNumber(argument);
        if (this.#mode === "deg") radians *= Math.PI / 180;
        const value = Math[name](radians);
        if (!Number.isFinite(value)) throw new CalcError("超出函数定义域");
        return normalizeValue(new Rational(BigInt(Math.round(value * Number(SNAP_GRID))), SNAP_GRID));
      }
      case "asin":
      case "acos":
      case "atan": {
        let value = Math[name](toNumber(argument));
        if (Number.isNaN(value)) throw new CalcError("超出函数定义域");
        if (this.#mode === "deg") value *= 180 / Math.PI;
        return snapNumber(value);
      }
      case "ln":
        return snapNumber(Math.log(toNumber(argument)));
      case "log":
        return snapNumber(Math.log10(toNumber(argument)));
      case "sqrt": {
        const value = Math.sqrt(toNumber(argument));
        if (Number.isNaN(value)) throw new CalcError("超出函数定义域");
        return value;
      }
      case "abs":
        return absValue(argument);
      default:
        throw new CalcError(`未知函数 ${name}`);
    }
  }

  #atEnd(): boolean {
    return this.#position >= this.#tokens.length;
  }

  #current(): Token | undefined {
    return this.#tokens[this.#position];
  }

  #matchOp(...operators: string[]): string | null {
    const token = this.#current();
    if (!token || token.kind !== "op" || !operators.includes(token.value)) return null;
    this.#position += 1;
    return token.value;
  }

  #matchNumber(): Rational | null {
    const token = this.#current();
    if (!token || token.kind !== "num") return null;
    this.#position += 1;
    return token.value;
  }

  #matchIdentifier(): string | null {
    const token = this.#current();
    if (!token || token.kind !== "id") return null;
    this.#position += 1;
    return token.value;
  }
}

export interface HistoryEntry {
  expr: string;
  result: CalcValue;
}

export class CalculatorEngine {
  mode: "rad" | "deg" = "rad";
  readonly history: HistoryEntry[] = [];

  evaluate(source: string): CalcValue {
    try {
      const value = normalizeValue(new Parser(new Lexer(source).tokens, this.mode).parse());
      this.history.unshift({ expr: source, result: value });
      while (this.history.length > MAX_HISTORY) this.history.pop();
      return value;
    } catch (error) {
      if (error instanceof CalcError) throw error;
      if (error instanceof RangeError) throw new CalcError("除数不能为零");
      throw new CalcError("无法解析的表达式");
    }
  }
}
