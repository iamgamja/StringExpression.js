const funcs = new Map();
function addFunc(name, func) {
    const argsCount = 0; // TODO
    funcs.set(name, [func, argsCount]);
}
export function getAllFuncName() {
    return [...funcs.keys()];
}
export function getFuncArgsCount(name) {
    const funcData = funcs.get(name);
    if (typeof funcData === "undefined")
        throw Error("This function does not exist.");
    const [, argsCount] = funcData;
    return argsCount;
}
export function calcFunc(name, ...args) {
    const funcData = funcs.get(name);
    if (!funcData)
        throw Error("This function does not exist.");
    const [func, argsCount] = funcData;
    if (argsCount > args.length)
        throw Error(`This function recives minimum of ${argsCount} arguments.\n But recived ${args.length}.`);
    return func(...args);
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
// type changers
addFunc("number", (v) => Number(v));
addFunc("string", (v) => String(v));
addFunc("bigint", (v) => BigInt(v));
