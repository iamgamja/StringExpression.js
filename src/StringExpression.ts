import parseStringExpression, { ExpressionChunk } from "./util/parseExpression.js";
import * as Funcs from "./data/functions.js";
import Variables from "./Variables.js";

// const funcNames = Funcs.getAllFuncName();
const calcFunc = Funcs.calcFunc;

export default class StringExpression {
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

  eval(args?: (string | number)[], variables?: Variables<any>) {
    if (
      !this.isVaild ||
      typeof this.parsedExpression === "undefined"
    ) throw Error("This expression is invaild.\nCheck this.parseError to see error message.");

    if (args) {
      if (!variables) variables = new Variables("number", "string", "StringExpression");
      for (let i = 0; i < args.length; i++) {
        const argName = this.argNames[i];
        console.log(argName, args[i]);
        variables.set(argName, args[i]);
      }
    }

    const results: any[] = [];
    for (let i = 0; i < this.parsedExpression.length; i++) {
      const [funcName, ...args] = this.parsedExpression[i];
      const parsedArgs: (number | string | StringExpression | undefined)[] = [];
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        let parsedArg: number | string | StringExpression | undefined;
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
        console.log([...parsedArgs], variables)
        result = code.eval([...parsedArgs], variables);
      } else {
        // native functions
        result = calcFunc(funcName, ...parsedArgs);
      }
      results.push(result);
    }

    return results[results.length - 1];
  }
}
