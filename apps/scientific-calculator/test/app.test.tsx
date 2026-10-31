// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { CalculatorApp } from "../src/app";

afterEach(cleanup);

function press(name: string): void {
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("CalculatorApp", () => {
  it("evaluates basic expressions and records history", () => {
    render(() => <CalculatorApp />);
    press("2");
    press("+");
    press("3");
    press("=");
    expect(screen.getByText("5", { selector: ".vela-calc__result" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /2\+3 = 5/ })).toBeTruthy();
  });

  it("switches to degree mode and evaluates trigonometry", () => {
    render(() => <CalculatorApp />);
    press("RAD");
    expect(screen.getByRole("button", { name: "DEG" })).toBeTruthy();
    press("sin");
    press("3");
    press("0");
    press(")");
    press("=");
    expect(screen.getByText("0.5", { selector: ".vela-calc__result" })).toBeTruthy();
  });

  it("shows engine errors and allows recovery", () => {
    render(() => <CalculatorApp />);
    press("1");
    press("÷");
    press("0");
    press("=");
    expect(screen.getByText("除数不能为零")).toBeTruthy();
    press("5");
    expect(screen.getByText("5", { selector: ".vela-calc__expr" })).toBeTruthy();
  });

  it("swaps second functions and evaluates square roots", () => {
    render(() => <CalculatorApp />);
    press("2nd");
    expect(screen.getByRole("button", { name: "2nd" }).className).toContain("is-active");
    press("√");
    press("4");
    press(")");
    press("=");
    expect(screen.getByText("2", { selector: ".vela-calc__result" })).toBeTruthy();
  });

  it("recalls a history entry", () => {
    render(() => <CalculatorApp />);
    press("2");
    press("+");
    press("3");
    press("=");
    press("7");
    press("+");
    fireEvent.click(screen.getByRole("button", { name: /2\+3 = 5/ }));
    expect(screen.getByText("2+3", { selector: ".vela-calc__expr" })).toBeTruthy();
  });
});
