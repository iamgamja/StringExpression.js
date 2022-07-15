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

/**
 * @param {any} expression 
 */
function visualParsedExpression(expression) {
  return expression.map((chunk, i) => `@${i} -> [${chunk.map(part => typeof part === "string" ? `'${part}'` : part).join(", ")}]`).join(",\n");
}

function updateExprOutput() {
  const strExpr = new StringExpression(exprInput.value);
  const expression = strExpr.parsedExpression;
  if (typeof expression !== "undefined") {
    let outputStr = "";
    outputStr += visualParsedExpression(expression);
    if (strExpr.codes) {
      for (let i = 0; i < strExpr.codes.length; i++) {
        if (typeof strExpr.codes[i].parsedExpression === "undefined") continue;
        outputStr += `\n---------- C${i} ----------\n`;
        outputStr += visualParsedExpression(strExpr.codes[i].parsedExpression);
      }
    }
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
      let valueStr = Array.isArray(value) ? `[${value.join(", ")}]` : typeof value !== "object" ? value : `(${((value ?? {}).argNames ?? []).join(", ")}) => ${(value ?? {}).rawExpression}`;
      outputStr += `${name}: ${valueStr}\n`;
    }
    outputStr = outputStr.trim();
  } catch (e) {
    outputStr = e.message;
  }
  varOutput.innerText = outputStr;
}
