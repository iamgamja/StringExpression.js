// @ts-nocheck

// Bundled manually :D

let StringExpression = (() => {
function matchOne(str: string, regexp: RegExp, groupNr?: number): string | undefined {
  const matches = str.match(regexp);
  if (matches == null) return undefined;
  if (typeof groupNr !== "undefined") {
    return matches[groupNr];
  } else {
    return matches[0];
  }
}
function parseQuotes(str: string): [replaced: string, values: string[]] {
  let inQuote = false;
  let quoteStartPos = -1;
  /**
   * -1 = *nothing*,
   * 0 = ',
   * 1 = "
   */
  let quoteType = -1;
  let replaced = "";
  const values: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // Check the string is escape charactor
    if (char === "\\") {
      i++;
      replaced += char + (str[i + 1] ?? "");
      continue;
    }

    if (inQuote) {
      // Check if the string is quote close charactor
      if (
        (quoteType === 0 && char === "'") ||
        (quoteType === 1 && char === "\"")
      ) {
        inQuote = false;
        quoteType = -1;
        quoteStartPos = -1;
      } else {
        values[values.length - 1] += char;
      }
    } else {
      // Check if the string is quote open charactor
      if (char === "'" || char === "\"") {
        inQuote = true;
        quoteType = char === "'" ? 0 : 1;
        replaced += `#${values.length}`;
        quoteStartPos = i;
        values.push("");
      } else {
        replaced += char;
      }
    }
  }

  if (inQuote) {
    throw Error(`Quote must be closed (at ${quoteStartPos})`);
  }

  return [replaced, values];
}

type ExpressionChunk = [string, ...(number | string)[]];
type ExpressionCode = [variableNames: string[], expressionStr: string];
type ParsedExpression = [parsedExpression: ExpressionChunk[], codes: ExpressionCode[]];
type FunctionData = [name: string, ...params: string[]];

function parseStringExpression(str: string, maxLoop: number=1000): ParsedExpression {
  if (str.length === 0) throw Error("Expression length must be 1 or longer.");

  let loopLeft = maxLoop;
  function didLoop() {
    loopLeft--;
    if (loopLeft < 0) throw Error("This expression is too complex.\nChange StringExpression.MAX_LOOP to higher to parse more complex expression.");
  }

  // Parse expression codes
  const codes: ExpressionCode[] = [];
  const codeCheckRegexp = /{(?: )*\(([A-Za-z][A-Za-z0-9]*(?: )*|(?:[A-Za-z][A-Za-z0-9]*(?: )*,(?: )*)+(?:[A-Za-z][A-Za-z0-9]*(?: )*))?\)(?: )*=>(?: )*([^}]+)(?: )*}/;
  const codeGetRegexp = /^{(?: )*\(([A-Za-z][A-Za-z0-9]*(?: )*|(?:[A-Za-z][A-Za-z0-9]*(?: )*,(?: )*)+(?:[A-Za-z][A-Za-z0-9]*(?: )*))?\)(?: )*=>(?: )*(.+)(?: )*}$/;
  while (true) {
    didLoop();
    if (str.match(codeCheckRegexp) === null) break;
    let bracketsLevel = 0;
    let beginPos = -1;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === "{") {
        if (beginPos === -1) {
          beginPos = i;
        }
        bracketsLevel++;
      } else if (char === "}") {
        bracketsLevel--;
        if (bracketsLevel < 0) throw Error(`Invaild brackets pair. (at ${i})`);
        if (bracketsLevel === 0) {
          const codeStr = str.slice(beginPos, i+1);
          const variableNameStr = matchOne(codeStr, codeGetRegexp, 1) ?? "";
          const expressionStr = matchOne(codeStr, codeGetRegexp, 2);
          if (
            typeof variableNameStr === "undefined" ||
            typeof expressionStr === "undefined"
          ) throw Error("Unknown parse error. (001)");
          const variableNames = variableNameStr.replace(/ /g, "").split(",");
          const prevLoop = loopLeft;
          const loopUsed = prevLoop - loopLeft;
          loopLeft -= loopUsed;
          str = str.replace(codeStr, `C${codes.length}`);
          codes.push([variableNames, expressionStr]);
        }
      }
    }
  }

  // Fix -function (-1 * function)
  const minusFunctionNameRegexp = /(?<!#[A-Za-z0-9]*)-([A-Za-z0-9]+)(?=[A-Za-z0-9]*\()/;
  while (true) {
    const match = matchOne(str, minusFunctionNameRegexp, 1);
    if (typeof match === "undefined") break;
    str = str.replace(minusFunctionNameRegexp, `-1*` + match);
    didLoop();
  }

  // Parse string, numbers, variables and function names
  const values: (number | string)[] = [];
  // strings
  try {
    const [replaced, stringValues] = parseQuotes(str);
    str = replaced;
    values.push(...stringValues.map(s => `S${s}`));
  } catch (e) {
    throw e;
  }
  // Fix -string (-1 * function)
  const minusStringRegexp = /(?<!#[0-9]*)-(#[0-9]+)/;
  while (true) {
    const match = matchOne(str, minusStringRegexp, 1);
    if (typeof match === "undefined") break;
    str = str.replace(minusStringRegexp, `-1*` + match);
    didLoop();
  }
  // numbers
  const numberRegexp = /(?<!(?:\$|#|[A-Za-z])\d*)\d+(?:\.\d+)?(?:e\d+)?(?!\d*(?:\(|[A-Za-z]))/
  while (true) {
    const match = matchOne(str, numberRegexp);
    if (typeof match === "undefined") break;
    str = str.replace(numberRegexp, `#${values.length}`);
    values.push(Number(match));
    didLoop();
  }
  // variables
  const invaildVariableRegexp1 = /\$[0-9][A-Za-z0-9]*/;
  if (invaildVariableRegexp1.test(str)) {
    const match = str.match(invaildVariableRegexp1);
    throw Error(`Variable name '${match}' is invaild.\nVariable name must starts with alphabet.`);
  }
  // const invaildVariableRegexp2 = /\$[A-Za-z/0-9]*[^A-Za-z/0-9]+[A-Za-z/0-9]*/;
  // if (invaildVariableRegexp2.test(str)) {
  //   const match = str.match(invaildVariableRegexp2);
  //   throw Error(`Variable name '${match}' is invaild.\nOnly alphabet and number is allowed in variable name.`);
  // }
  const varialbesRegexp = /\$[A-Za-z][A-Za-z0-9]*/;
  while (true) {
    const match = matchOne(str, varialbesRegexp);
    if (typeof match === "undefined") break;
    str = str.replace(varialbesRegexp, `#${values.length}`);
    values.push(match);
    didLoop();
  }
  // function names
  const functionNameRegexp = /(?<!#[A-Za-z0-9]*)[A-Za-z0-9]+(?=[A-Za-z0-9]*\()/;
  while (true) {
    const match = matchOne(str, functionNameRegexp);
    if (typeof match === "undefined") break;
    str = str.replace(functionNameRegexp, `#${values.length}`);
    values.push(match);
    didLoop();
  }

  // Check the expression is vaild
  str = str.replace(/( |\t|\n)/g, "");
  // double variable
  const invaildTestRegexp1 = /#\d+#\d+/;
  if (invaildTestRegexp1.test(str)) {
    const invaildGetRegexp = /#(\d+)#(\d+)/;
    const idx1 = Number(matchOne(str, invaildGetRegexp, 1));
    const idx2 = Number(matchOne(str, invaildGetRegexp, 2));
    if (
      typeof idx1 === "undefined" ||
      typeof idx2 === "undefined"
    ) throw Error("Unknown parse error. (002)");
    throw Error(`Parse error between '${values[idx1]}' and '${values[idx2]}'.`);
  }
  // remaining strings
  const invaildTestRegexp2 = /(?<!#[A-Za-z0-9]*)[A-Za-z0-9]+/g;
  if (invaildTestRegexp2.test(str)) {
    const invaildExceptionRegexp = /C\d+/;
    const match = str.match(invaildTestRegexp2);
    if (match === null) throw Error("Unknown parse error. (003)");
    const filtered = match.filter(m => !invaildExceptionRegexp.test(m));
    if (filtered.length > 0) throw Error(`Parse error at '${match}'.`);
  }
  // barcat match
  let testBracketsLevel = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === "(") {
      testBracketsLevel++;
    } else if (char === ")") {
      testBracketsLevel--;
      if (testBracketsLevel < 0) throw Error(`Invaild brackets pair. (at ${i})`);
    }
  }
  if (testBracketsLevel !== 0) throw Error("There is one or more unterminated brackets.");

  // Parse functions
  const functions: FunctionData[] = [];
  const functionExistTestRegexp = /#\d+\(/;
  const functionBeginTestRegexp = /^#\d+\(/;
  const functionNameIdxRegexp = /^#(\d+)\(/;
  const functionParamsRegexp = /^#\d+\((.*)\)$/;
  funcLoop: while (true) {
    didLoop();
    if (!functionExistTestRegexp.test(str)) break;
    let bracketsLevel = 0;
    let beginPos = -1;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const sliced = str.slice(i);
      if (functionBeginTestRegexp.test(sliced)) {
        beginPos = i;
        bracketsLevel = 0;
      }
      if (char === "(") {
        bracketsLevel++;
      } else if (char === ")") {
        bracketsLevel--;
        if (bracketsLevel === 0) {
          const funcStr = str.slice(beginPos, i+1);
          str = str.replace(funcStr, `F${functions.length}`);
          const funcNameIdx = matchOne(funcStr, functionNameIdxRegexp, 1);
          if (typeof funcNameIdx === "undefined") throw Error("Unknown parse error. (004)");
          const funcName = values[Number(funcNameIdx)];
          if (typeof funcName === "number") throw Error("Unknown parse error. (005)");
          const params = matchOne(funcStr, functionParamsRegexp, 1);
          if (typeof params === "undefined") throw Error("Unknown parse error. (006)");
          const splitedParams = params.split(",");
          functions.push([funcName, ...splitedParams]);
          continue funcLoop;
        }
      }
    }
    if (bracketsLevel !== 0) throw Error("There is one or more unterminated brackets.");
  }

  // Parse expression
  const parsed: ExpressionChunk[] = [];
  const operatorPriorities = [
    ["^"],
    ["*", "/"],
    ["+", "-"],
    ["%"]
  ];
  const operatorRegexps: RegExp[] = operatorPriorities.map(ops => new RegExp(`((?:#|@|F|C)\\d+)(${ops.map(op => "\\" + op).join("|")})((?:#|@|F|C)\\d+)`));
  const parseEndRegexp = /^@\d+$/;
  const invaildTestRegexp3 = new RegExp(`(?:${operatorPriorities.flat().map(op => `\\${op}`).join("|")})$`);
  const minusFixCheckRegexp = /-#\d+/;
  parseExpression(str);
  function parseExpression(str: string): number {
    if (invaildTestRegexp3.test(str)) throw Error(`Syntax error (at '${str.slice(-1)}')`);
    while (true) {
      if (!str.includes("(")) {
        parsePart(str);
        break;
      }
      didLoop();
      let beginPos = -1;
      for (let i = 0; i < str.length; i++) {
        didLoop();
        const char = str[i];
        if (char === "(") {
          beginPos = i;
        } else if (char === ")") {
          if (beginPos !== -1) {
            const part = str.slice(beginPos+1, i);
            const point = parsePart(part);
            const pointStr = `@${point}`;
            str = str.replace(`(${part})`, pointStr);
            i -= `(${part})`.length - pointStr.length;
            beginPos = -1;
          } else {
            i = -1;
          }
        }
      }
      if (parseEndRegexp.test(str)) break;  
    }
    return parsed.length - 1;
  }
  function parsePart(part: string) {
    let didParse = false;
    exprLoop: while (true) {
      for (const regexp of operatorRegexps) {
        didLoop();
        if (!regexp.test(part)) continue;
        didParse = true;
        const operatorPart = matchOne(part, regexp);
        const operator = matchOne(part, regexp, 2);
        const val1point = matchOne(part, regexp, 1);
        const val2point = matchOne(part, regexp, 3);
        if (
          typeof operatorPart === "undefined" ||
          typeof operator === "undefined" ||
          typeof val1point === "undefined" ||
          typeof val2point === "undefined"
        ) throw Error("Unknown parse error. (007)");
        const vals = [
          val1point.startsWith("#") ? values[Number(val1point.slice(1))] : val1point,
          val2point.startsWith("#") ? values[Number(val2point.slice(1))] : val2point
        ];
        const point = parseOperator(operator, vals[0], vals[1]);
        part = part.replace(operatorPart, `@${point}`);
        continue exprLoop;
      }
      if (!didParse) {
        const val = part.startsWith("#") ? values[Number(part.slice(1))] : part;
        if (typeof val === "string" && minusFixCheckRegexp.test(val)) {
          parseOperator("minus", values[Number(val.slice(2))]);
        } else {
          parseOperator("val", val);
        }
        part = part.replace(part, ``);
      }
      didLoop();
      break;
    }
    return parsed.length - 1;
  }
  function parseOperator(operator: string, ...vals: (string | number)[]): number {
    didLoop();
    // Check function
    for (let i = 0; i < vals.length; i++) {
      const val = vals[i];
      if (
        typeof val !== "string" ||
        !val.startsWith("F")
      ) continue;
      const point = parseFunction(functions[Number(val.slice(1))]);
      // replace val to point
      vals[i] = `@${point}`;
    }
    parsed.push([operator, ...vals]);
    return parsed.length - 1;
  }
  function parseFunction(functionData: FunctionData) {
    let [funcName, ...funcParams] = functionData;
    funcParams = funcParams.filter(v => v !== "");
    const points = funcParams.map(param => parseExpression(param));
    parsed.push([funcName, ...points.map(p => `@${p}`)]);
    return parsed.length - 1;
  }

  return [parsed, codes];
}

interface VariableTypes {
  "number": number;
  "string": string;
  "StringExpression": StringExpression;

  "number_arr": number[];
  "string_arr": string[];
}

class Variables<T extends (keyof VariableTypes)[]> {
  private readonly vars: Map<string, VariableTypes[T[number]]>;
  // @ts-ignore
  private readonly types: T;

  constructor(...types: T) {
    this.vars = new Map();
    this.types = types;
  }

  set(name: string, value: VariableTypes[T[number]]) {
    this.vars.set(name, value);
  }

  get(name: string) {
    return this.vars.get(name);
  }

  remove(name: string) {
    this.vars.delete(name);
  }

  entries() {
    return this.vars.entries();
  }

  clone(): Variables<T> {
    let clone = new Variables(...this.types);
    for (const [name, value] of this.entries()) {
      clone.set(name, value);
    }
    return clone;
  }

  get size() {
    return this.vars.size;
  }
}

// type AvaiableTypes = number | string | number[] | string[];
type Func = (this: Variables<any>, ...args: any[]) => any;
const funcs: Map<string, [func: Func, argsCount: number]> = new Map();
function addFunc(name: string, func: Func) {
  const argsCount = 0; // TODO
  funcs.set(name, [func, argsCount]);
}

function calcFunc(name: string, variables: Variables<any>, ...args: any[]) {
  const funcData = funcs.get(name);
  if (!funcData) throw Error("This function does not exist.");
  const [func, argsCount] = funcData;
  if (argsCount > args.length) throw Error(`This function recives minimum of ${argsCount} arguments.\n But recived ${args.length}.`);
  return func.call(variables, ...args);
}

// important functions
addFunc("val", (v) => v);
// operators
addFunc("%", (a, b) => a % b);
addFunc("+", (a, b) => a + b);
addFunc("-", (a, b) => a - b);
addFunc("*", (a, b) => a * b);
addFunc("/", (a, b) => a / b);
addFunc("^", (a, b) => a ** b);
// math functions
addFunc("minus", (x) => -x);
addFunc("min", (a, b) => Math.min(a, b));
addFunc("max", (a, b) => Math.max(a, b));
addFunc("sqrt", (a) => Math.sqrt(a));
addFunc("round", (x) => Math.round(x));
addFunc("abs", (x) => Math.abs(x));
addFunc("sign", (x) => Math.sign(x));
addFunc("sin", (x) => Math.sin(x));
addFunc("cos", (x) => Math.cos(x));
addFunc("tan", (x) => Math.tan(x));
addFunc("atan2", (y, x) => Math.atan2(y, x));
// complex math functions
addFunc("rand", () => Math.random());
addFunc("randr", (a, b) => a + (Math.random()) * (b - a));
addFunc("randint", (a, b) => Math.floor(a + (Math.random()) * (b - a)));
addFunc("rands", (n) => Array.from({ length: Number(n) }, () => Math.random()));
addFunc("sum", (...args) => {
  if (args.length === 1 && Array.isArray(args[0])) {
    args = args[0];
  }
  return args.reduce((a, b) => a + b, typeof args[0] === "string" ? "" : 0)
});
// type changers
addFunc("number", (v) => Number(v));
addFunc("string", (v) => String(v));
// compare
addFunc("eq", (a, b) => a === b);
addFunc("gt", (a, b) => a > b);
addFunc("lt", (a, b) => a < b);
addFunc("gte", (a, b) => a >= b);
addFunc("lte", (a, b) => a <= b);
// bool
addFunc("and", (...v) => v.every(v => v == true));
addFunc("or", (...v) => !!v.find(v => v == true));
addFunc("not", (a) => !a);
addFunc("xor", (a, b) => a^b);
// if
addFunc("if", (s, a) => s ? a : undefined);
addFunc("ifelse", (s, a, b) => s ? a : b);
addFunc("fif", function (s, a: StringExpression) {
  return s ? a.eval([], this) : undefined;
});
addFunc("fifelse", function (s, a: StringExpression, b: StringExpression) {
  return s ? a.eval([], this) : b.eval([], this);
});
// array
addFunc("arr", (...args) => args);
addFunc("arrget", (arr, i) => Array.isArray(arr) ? arr[i] : undefined);
addFunc("arrset", (arr, i, value) => Array.isArray(arr) ? (arr[i] = value) : undefined);
addFunc("len", (arr) => arr.length);
addFunc("map", function (arr: any[], callback: StringExpression) {
  return arr.map((v, i) => callback.eval([v, i], this));
});
addFunc("reduce", function (arr: any[], callback: StringExpression, initialValue: any) {
  return arr.reduce((a, b, i) => callback.eval([a, b, i], this), initialValue);
});
// string
addFunc("strtoarr", (str) => str.split(""));
addFunc("arrtostr", (arr) => Array.isArray(arr) ? arr.join("") : "")
addFunc("tocharcode", (char) => typeof char === "string" ? char.charCodeAt(0) : -1);
addFunc("tocharcodes", (str) => typeof str === "string" ? str.split("").map(v => v.charCodeAt(0)) : -1);
addFunc("fromcharcode", (code) => typeof code === "number" ? String.fromCharCode(code) : "");
addFunc("fromcharcodes", (codes) => Array.isArray(codes) ? codes.map(v => String.fromCharCode(v)) : "");

type VariableType = string | number | string[] | number[] | StringExpression | undefined;
// const funcNames = Funcs.getAllFuncName();

class StringExpression {
  readonly rawExpression: string;
  private readonly argNames: string[];
  private readonly parsedExpression: ExpressionChunk[] | undefined;
  private readonly codes: StringExpression[] | undefined;
  readonly parseError: string;
  readonly isVaild: boolean;
  
  constructor(str: string, argNames?: string[]) {
    this.argNames = argNames ? [...argNames] : [];
    this.rawExpression = str;
    try {
      const [parsedExpression, codes] = parseStringExpression(str, StringExpression.MAX_LOOP);
      this.parsedExpression = parsedExpression;
      this.codes = codes.map(code => new StringExpression(code[1], code[0]));
      this.parseError = "";
      this.isVaild = true;
    } catch (e) {
      this.parsedExpression = undefined;
      this.codes = undefined;
      this.parseError = e+"";
      this.isVaild = false;
    }
    // if (this.parsedExpression) {
    //   for (const [funcName, ...args] of this.parsedExpression) {
    //     if (funcNames.includes(funcName)) {
    //       const argsCount = Funcs.getFuncArgsCount(funcName);
    //       if (argsCount > args.length) {
    //         this.parsedExpression = undefined;
    //         this.parseError = `This function recives minimum of ${argsCount} arguments.\n But recived ${args.length}.`;
    //         this.isVaild = false;
    //         break;
    //       }
    //     } else {
    //       this.parsedExpression = undefined;
    //       this.parseError = `Error: Invaild function (at '${funcName}')`;
    //       this.isVaild = false;
    //       break;
    //     }
    //   }
    // }
  }

  static MAX_LOOP = 1000;

  eval(args?: VariableType[], variables?: Variables<any>) {
    if (
      !this.isVaild ||
      typeof this.parsedExpression === "undefined"
    ) throw Error("This expression is invaild.\nCheck this.parseError to see error message.");

    if (!variables) variables = new Variables("number", "string", "StringExpression");
    if (args) {
      variables = variables.clone();
      for (let i = 0; i < args.length; i++) {
        const argName = this.argNames[i];
        variables.set(argName, args[i]);
      }
    }

    const results: any[] = [];
    for (let i = 0; i < this.parsedExpression.length; i++) {
      const [funcName, ...args] = this.parsedExpression[i];
      const parsedArgs: VariableType[] = [];
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        let parsedArg: VariableType;
        if (typeof arg === "number") {
          parsedArg = arg;
        } else if (typeof arg === "string") {
          const pointType = arg[0];
          const pointData = arg.slice(1);
          if (pointType === "@") {
            parsedArg = results[Number(pointData)];
          } else if (pointType === "$") {
            parsedArg = variables?.get(pointData);
          } else if (pointType === "S") {
            parsedArg = arg.slice(1);
          } else if (pointType === "C") {
            if (
              typeof this.codes === "undefined" ||
              typeof this.codes[Number(pointData)] === "undefined"
            ) throw Error("An Error occurred while executing the custom code.");
            parsedArg = this.codes[Number(pointData)];
          } else {
            parsedArg = arg;
          }
        }
        // if (typeof parsedArg === "undefined") throw Error(`${arg} is undefined.`);
        parsedArgs.push(parsedArg);
      }
      let result;
      if (funcName.startsWith("$")) {
        // code
        const code = variables?.get(funcName.slice(1));
        result = code.eval([...parsedArgs], variables);
      } else if (funcName.startsWith("C")) {
        // anonymous function
        if (this.codes) {
          const code = this.codes[Number(funcName.slice(1))];
          result = code.eval([...parsedArgs], variables);
        } else {
          result.push(undefined);
        }
      } else {
        // native functions
        result = calcFunc(funcName, variables, ...parsedArgs);
      }
      results.push(result);
    }

    return results[results.length - 1];
  }
}

return StringExpression;
})();