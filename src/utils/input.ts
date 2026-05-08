import readline from "node:readline";

// Handles retrieving input from the user.

const inputBuffer: string[] = [];

const rli = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rli.on("line", (data: string) => {
    inputBuffer.push(data);
});

// Reads in a single line of input from the user.
export async function input(): Promise<string> {
    return new Promise((res, rej) => {
        if (inputBuffer.length > 0)
            res(inputBuffer.shift()!);
        else
            rli.question("", res);
    });
}

// Waits until the user inputs a number between min and max inclusive, in which case it returns
// that number.
export async function inputNumber(min: number, max: number): Promise<number> {
    let t: number = NaN;
    while (isNaN(t) || t < min || t > max)
        t = parseFloat(await input());

    return t;
}

// Presents a list of numbered choices to the user and waits until the user chooses one of the
// options (by typing in a number representing that choice). Returns the number the user chose.
export async function options(choices: string[]): Promise<number> {
    for (let i = 0; i < choices.length; i++)
        console.log(` ${i} - ${choices[i]}`);
    console.log("");

    return new Promise(async (res, _) => {
        while (true){
            const answer = await input();
            const idx = choices.indexOf(answer);
            if (idx > -1){
                res(idx);
                break;
            }else if (!isNaN(parseInt(answer))){
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
