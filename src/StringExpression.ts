import parseStringExpression, { ParsedExpression } from "./util/parseExpression.js";
import * as Funcs from "./data/functions.js";
import type Variables from "./Variables";

const funcNames = Funcs.getAllFuncName();
const calcFunc = Funcs.calcFunc;

export default class StringExpression {
  readonly rawExpression: string;
  private readonly parsedExpression: ParsedExpression | undefined;
  readonly parseError: string;
  readonly isVaild: boolean;
  
  constructor(str: string) {
    this.rawExpression = str;
    try {
      this.parsedExpression = parseStringExpression(str, StringExpression.MAX_LOOP);
      this.parseError = "";
      this.isVaild = true;
    } catch (e) {
      this.parsedExpression = undefined;
      this.parseError = e+"";
      this.isVaild = false;
    }
    if (this.parsedExpression) {
      for (const [funcName, ...args] of this.parsedExpression) {
        if (funcNames.includes(funcName)) {
          const argsCount = Funcs.getFuncArgsCount(funcName);
          if (argsCount > args.length) {
            this.parsedExpression = undefined;
            this.parseError = `This function recives minimum of ${argsCount} arguments.\n But recived ${args.length}.`;
            this.isVaild = false;
            break;
          }
        } else {
          this.parsedExpression = undefined;
          this.parseError = `Error: Invaild function (at '${funcName}')`;
          this.isVaild = false;
          break;
        }
      }
    }
  }

  static MAX_LOOP = 1000;

  eval(variables?: Variables<["number", "string"]> | Variables<["string", "number"]>) {
    if (
      !this.isVaild ||
      typeof this.parsedExpression === "undefined"
    ) throw Error("This expression is invaild.\nCheck this.parseError to see error message.");

    const results: any[] = [];
    for (let i = 0; i < this.parsedExpression.length; i++) {
      const [funcName, ...args] = this.parsedExpression[i];
      const parsedArgs: (string | number)[] = [];
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        let parsedArg: number | string | undefined;
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
          } else {
            parsedArg = arg;
          }
        }
        if (typeof parsedArg === "undefined") throw Error(`${arg} is undefined.`);
        parsedArgs.push(parsedArg);
      }

      const result = calcFunc(funcName, ...parsedArgs);
      results.push(result);
    }

    return results[results.length - 1];
  }
}
