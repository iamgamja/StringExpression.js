import StringExpression from "./StringExpression.js";
export default class StringCode extends StringExpression {
    constructor(expressionCode) {
        super();
        const [variableNames] = expressionCode;
    }
}
