// @ts-check
import StringExpression from "../dist/StringExpression.js";
import parseStringVariables from "../dist/util/parseStringVariables.js";
import { getAllFuncName } from "../dist/data/functions.js";

const functionLookup = /** @type {HTMLDivElement} */(document.getElementById("example__function-lookup"));
functionLookup.innerText = "Avaiable functions: " + getAllFuncName().join(", ");
const exprInput = /** @type {HTMLTextAreaElement} */(document.getElementById("example__expression-input"));
const exprOutput = /** @type {HTMLDivElement} */(document.getElementById("example__expression-output"));
exprInput.focus();
const varInput = /** @type {HTMLInputElement} */(document.getElementById("example__variable-input"));
const varOutput = /** @type {HTMLDivElement} */(document.getElementById("example__variable-output"));

exprInput.addEventListener("keyup", updateExprOutput);
exprInput.addEventListener("keydown", updateExprOutput);
exprInput.addEventListener("keypress", updateExprOutput);
varInput.addEventListener("keyup", updateValOutput);
varInput.addEventListener("keydown", updateValOutput);
varInput.addEventListener("keypress", updateValOutput);
updateExprOutput();
updateValOutput();

function updateExprOutput() {
  const strExpr = new StringExpression(exprInput.value);
  const expression = strExpr.parsedExpression;
  if (typeof expression !== "undefined") {
    const outputStr = expression.map((chunk, i) => `@${i} -> [${chunk.map(part => typeof part === "string" ? `'${part}'` : part).join(", ")}]`).join(",\n");
    exprOutput.innerText = outputStr;
  } else {
    exprOutput.innerText = strExpr.parseError;
  }
}

function updateValOutput() {
  let outputStr = "";
  try {
    const result = parseStringVariables(varInput.value, "\n");
    for (const [name, value] of result.entries()) {
      outputStr += `${name}: ${value}\n`;
    }
    outputStr = outputStr.trim();
  } catch (e) {
    outputStr = e.message;
  }
  varOutput.innerText = outputStr;
}
