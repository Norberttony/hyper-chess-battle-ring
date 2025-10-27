
import { styleText } from "node:util";


export function logError(msg){
    console.error(styleText("red", msg));
    return new Error(msg);
}

export function logWarn(msg){
    console.warn(styleText("yellow", msg));
}
