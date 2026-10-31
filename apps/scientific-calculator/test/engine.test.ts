// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  CalculatorEngine,
  CalcError,
  formatValue,
  Rational,
} from "../src/engine";

function rational(numerator: bigint, denominator = 1n): Rational {
  return new Rational(numerator, denominator);
}

describe("calculator engine", () => {
  it("respects precedence, parentheses and left associativity", () => {
    const engine = new CalculatorEngine();
    expect(engine.evaluate("2+3*4")).toBe(14);
    expect(engine.evaluate("(1+2)*3")).toBe(9);
    expect(engine.evaluate("10-4+1-2")).toBe(5);
    expect(engine.evaluate("2 + 3")).toBe(5);
  });

  it("keeps decimals exact with rational arithmetic", () => {
    const engine = new CalculatorEngine();
    expect(engine.evaluate("1/8")).toEqual(rational(1n, 8n));
    expect(engine.evaluate("0.1+0.2")).toEqual(rational(3n, 10n));
    expect(engine.evaluate("0.25*0.4")).toEqual(rational(1n, 10n));
  });

  it("handles powers, modulo and unary minus", () => {
    const engine = new CalculatorEngine();
    expect(engine.evaluate("2^10")).toBe(1024);
    expect(engine.evaluate("2^3^2")).toBe(512);
    expect(engine.evaluate("2^-2")).toEqual(rational(1n, 4n));
    expect(engine.evaluate("-2^2")).toBe(-4);
    expect(engine.evaluate("10%3")).toBe(1);
  });

  it("supports degree and radian trigonometry", () => {
    const engine = new CalculatorEngine();
    expect(engine.mode).toBe("rad");
    engine.mode = "deg";
    expect(engine.evaluate("sin(30)")).toEqual(rational(1n, 2n));
    expect(engine.evaluate("asin(0.5)")).toBe(30);

    engine.mode = "rad";
    expect(engine.evaluate("sin(π/2)")).toBe(1);
    expect(engine.evaluate("cos(0)")).toBe(1);
    expect(engine.evaluate("sin(30)")).not.toEqual(rational(1n, 2n));
  });

  it("supports sqrt, ln, log, abs and constants", () => {
    const engine = new CalculatorEngine();
    const root = engine.evaluate("sqrt(2)");
    expect(typeof root).toBe("number");
    expect(root as number).toBeCloseTo(1.4142135623, 9);
    expect(engine.evaluate("sqrt(4)")).toBe(2);
    expect(engine.evaluate("ln(e)")).toBe(1);
    expect(engine.evaluate("log(100)")).toBe(2);
    expect(engine.evaluate("abs(-3)")).toBe(3);
    expect(engine.evaluate("π") as number).toBeCloseTo(Math.PI, 12);
    expect(engine.evaluate("2*pi") as number).toBeCloseTo(2 * Math.PI, 12);
    expect(engine.evaluate("e") as number).toBeCloseTo(Math.E, 12);
  });

  it("records successful history newest-first and stops at 50", () => {
    const engine = new CalculatorEngine();
    engine.evaluate("2+3*4");
    engine.evaluate("(1+2)*3");
    expect(engine.history.slice(0, 2)).toEqual([
      { expr: "(1+2)*3", result: 9 },
      { expr: "2+3*4", result: 14 },
    ]);

    expect(() => engine.evaluate("1/0")).toThrow(CalcError);
    expect(engine.history).toHaveLength(2);

    for (let index = 0; index < 60; index += 1) engine.evaluate(`${index}+1`);
    expect(engine.history).toHaveLength(50);
    expect(engine.history[0]?.result).toBe(60);
    expect(engine.history[49]?.result).toBe(11);
  });

  it("uses the same Chinese error model", () => {
    const engine = new CalculatorEngine();
    expect(() => engine.evaluate("2+3*")).toThrow("无法解析的表达式");
    expect(() => engine.evaluate("(1+2")).toThrow("无法解析的表达式");
    expect(() => engine.evaluate("1/0")).toThrow("除数不能为零");
    expect(() => engine.evaluate("10%0")).toThrow("除数不能为零");
    expect(() => engine.evaluate("foo(1)")).toThrow("未知函数 foo");
    expect(() => engine.evaluate("x+1")).toThrow("未知常量 x");
    expect(() => engine.evaluate("toString")).toThrow("未知常量 toString");
    expect(() => engine.evaluate("2@3")).toThrow("无法解析的表达式");
  });

  it("formats rationals, floats and integers", () => {
    expect(formatValue(rational(1n, 2n))).toBe("0.5");
    expect(formatValue(rational(25n))).toBe("25");
    expect(formatValue(rational(3n, 2n))).toBe("1.5");
    expect(formatValue(rational(3n, 10n))).toBe("0.3");
    expect(formatValue(1.5)).toBe("1.5");
    expect(formatValue(2)).toBe("2");
    expect(formatValue(0.3)).toBe("0.3");
    expect(formatValue(1e-5)).toBe("1e-05");
  });
});
