
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

export async function inputNumber(min, max){
    let t = NaN;
    while (isNaN(t) || t < min || t > max)
        t = parseFloat(await input());

    return t;
}

export async function options(choices){
    for (let i = 0; i < choices.length; i++)
        console.log(` ${i} - ${choices[i]}`);
    console.log("");

    return new Promise(async (res, rej) => {
        while (true){
            const answer = await input();
            const idx = choices.indexOf(answer);
            if (idx > -1){
                res(idx);
                break;
            }else if (!isNaN(answer)){
                const v = parseInt(answer);
                if (v < 0 || v >= choices.length){
                    console.log(`The value ${v} is out of range.`);
                }else{
                    res(v);
                    break;
                }
            }else{
                console.log("Please type in the name of the option or its value.");
            }
        }
    });
}
