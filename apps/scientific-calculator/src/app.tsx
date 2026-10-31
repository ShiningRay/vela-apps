import { createSignal, For } from "solid-js";
import { CalculatorEngine, CalcError, formatValue } from "./engine";
import type { HistoryEntry } from "./engine";

const SCI_ROWS = [
  ["sin", "cos", "tan", "π"],
  ["ln", "log", "√", "e"],
  ["asin", "acos", "atan", "^"],
  ["abs", "(", ")", "%"],
] as const;

const SCI_ALT = [
  ["asin", "acos", "atan", "π"],
  ["ln", "log", "√", "e"],
  ["sin", "cos", "tan", "^"],
  ["abs", "(", ")", "%"],
] as const;

const KEYPAD_COLUMNS = [
  ["7", "4", "1", "0"],
  ["8", "5", "2", "."],
  ["9", "6", "3", "="],
  ["÷", "×", "−", "+"],
] as const;

const KEYPAD_APPEND: Record<string, string> = {
  "÷": "/",
  "×": "*",
  "−": "-",
  "+": "+",
};

function insertText(label: string): string {
  if (label === "(" || label === ")") return label;
  if (label === "√") return "sqrt(";
  if (label === "π" || label === "e" || label === "^" || label === "%") return label;
  return `${label}(`;
}

export function CalculatorApp() {
  const engine = new CalculatorEngine();
  const [expr, setExpr] = createSignal("");
  const [result, setResult] = createSignal("");
  const [error, setError] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");
  const [deg, setDeg] = createSignal(false);
  const [second, setSecond] = createSignal(false);
  const [history, setHistory] = createSignal<HistoryEntry[]>([]);

  const press = (text: string): void => {
    if (error()) {
      setError(false);
      setErrorMessage("");
      setExpr("");
      setResult("");
    }
    setExpr((current) => current + text);
  };

  const equals = (): void => {
    if (!expr()) return;
    engine.mode = deg() ? "deg" : "rad";
    try {
      const value = engine.evaluate(expr());
      setResult(formatValue(value));
      setExpr("");
      setError(false);
      setErrorMessage("");
      setHistory([...engine.history]);
    } catch (caught) {
      setErrorMessage(caught instanceof CalcError ? caught.message : String(caught));
      setError(true);
      setResult("");
    }
  };

  const clearAll = (): void => {
    setExpr("");
    setResult("");
    setError(false);
    setErrorMessage("");
  };

  const backspace = (): void => {
    if (error()) {
      setError(false);
      setErrorMessage("");
      return;
    }
    setExpr((current) => current.slice(0, -1));
  };

  const toggleDeg = (): void => {
    setDeg((current) => {
      const next = !current;
      engine.mode = next ? "deg" : "rad";
      return next;
    });
  };

  const recall = (entry: HistoryEntry): void => {
    setExpr(entry.expr);
    setResult("");
    setError(false);
    setErrorMessage("");
  };

  const sciKey = (label: string) => (
    <button
      type="button"
      class="vela-calc__key vela-calc__key--sci"
      onClick={() => press(insertText(label))}
    >
      {label}
    </button>
  );

  return (
    <div class="vela-calc">
      <div class="vela-calc__display" aria-live="polite">
        <div class="vela-calc__expr" data-error={error() ? "true" : "false"}>
          {error() ? errorMessage() : expr() || " "}
        </div>
        <div class="vela-calc__result">{result() || "0"}</div>
      </div>

      <div class="vela-calc__modes">
        <button
          type="button"
          class={`vela-calc__key vela-calc__key--mode ${deg() ? "is-active" : ""}`}
          onClick={toggleDeg}
        >
          {deg() ? "DEG" : "RAD"}
        </button>
        <button
          type="button"
          class={`vela-calc__key vela-calc__key--mode ${second() ? "is-active" : ""}`}
          onClick={() => setSecond((value) => !value)}
        >
          2nd
        </button>
        <button type="button" class="vela-calc__key" onClick={clearAll}>
          C
        </button>
        <button type="button" class="vela-calc__key" onClick={backspace}>
          ⌫
        </button>
      </div>

      <div class="vela-calc__sci">
        <For each={second() ? SCI_ALT : SCI_ROWS}>
          {(column) => <div class="vela-calc__column">{column.map(sciKey)}</div>}
        </For>
      </div>

      <div class="vela-calc__pad">
        <For each={KEYPAD_COLUMNS}>
          {(column) => (
            <div class="vela-calc__column">
              <For each={column}>
                {(key) =>
                  key === "=" ? (
                    <button
                      type="button"
                      class="vela-calc__key vela-calc__key--equals"
                      onClick={equals}
                    >
                      =
                    </button>
                  ) : (
                    <button
                      type="button"
                      class={`vela-calc__key ${KEYPAD_APPEND[key] ? "vela-calc__key--op" : ""}`}
                      onClick={() => press(KEYPAD_APPEND[key] ?? key)}
                    >
                      {key}
                    </button>
                  )
                }
              </For>
            </div>
          )}
        </For>
      </div>

      <div class="vela-calc__history">
        <div class="vela-calc__history-title">History</div>
        <For each={history().slice(0, 8)}>
          {(entry) => (
            <button
              type="button"
              class="vela-calc__history-item"
              onClick={() => recall(entry)}
            >
              {entry.expr} = {formatValue(entry.result)}
            </button>
          )}
        </For>
        {history().length === 0 ? <span class="vela-calc__history-empty">No history yet</span> : null}
      </div>
    </div>
  );
}
