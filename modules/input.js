
const readline = require("readline");

const rli = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function input(){
    return new Promise((res, rej) => {
        rli.question("", (v) => {
            res(v);
        });
    });
}

module.exports = { input };
