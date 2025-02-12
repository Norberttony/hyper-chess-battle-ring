
import readline from "readline";

const rli = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export async function input(){
    return new Promise((res, rej) => {
        rli.question("", (v) => {
            res(v);
        });
    });
}
