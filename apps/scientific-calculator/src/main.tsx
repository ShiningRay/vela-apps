import { render } from "solid-js/web";
import { CalculatorApp } from "./app";
import "./tokens.css";
import "./calculator.css";
import "./app.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element.");

render(() => <CalculatorApp />, root);
