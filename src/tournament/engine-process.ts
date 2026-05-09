import fs from "node:fs";
import pathModule from "node:path";
import { ChildProcess, spawn } from "node:child_process";
import { Bot } from "./tournament.js";

// Creates an engine process (wrapper class around a live executable) that is capable of feeding
// input into the executable and returning output from the engine .exe file.
export class EngineProcess {
    private proc: ChildProcess | undefined;

    // log is all of the input/output to/from the engine so far
    // input is indexed by a " > " before the line.
    public log: string = "";

    // broken keeps track of "broken" lines (see #getLines)
    public broken: string = "";

    // for prompt
    private promptPrefix: string | undefined;
    private onPromptSuccess: ((data: string) => any) | undefined;
    private promptTimeout: NodeJS.Timeout | number = -1;

    constructor(public path: string, private onReadLine: (data: string) => any = () => 0){
        this.proc = spawn(path);

        this.proc.stdout?.on("data", (data) => {
            this.getLines(data.toString());
        });

        this.proc.on("error", (err: Error) => {
            throw err;
        });
    }

    // internal function that separates out stdout into complete lines.
    private getLines(stdoutData: string): void {
        // stdout data might have multiple lines, and the last line might be cut off.
        const lines = (this.broken + stdoutData).split("\n");
        if (!stdoutData.endsWith("\n") || lines[lines.length - 1] == "")
            this.broken = lines.pop()!;

        for (const l of lines){
            const line = l.trim();
            this.log += `${line}\n`;
            this.onReadLine(line);
            if (this.promptPrefix && line.startsWith(this.promptPrefix)){
                if (this.onPromptSuccess)
                    this.onPromptSuccess(line);
                clearTimeout(this.promptTimeout);
                delete this.promptPrefix;
            }
        }
    }

    // Returns a promise that is either resolved with the line that starts with prefix or rejects
    // it if a response beginning with "prefix" is not sent by the engine within timeoutMs time
    //
    // sends "cmd" to the engine and immediately waits for a response that begins with the given
    // prefix
    public prompt(cmd: string, prefix: string, timeoutMs: number = 5000): Promise<string> {
        if (this.promptPrefix)
            throw new Error("EngineProcess: cannot prompt; currently responding to an earlier prompt");
        return new Promise((res, rej) => {
            this.promptPrefix = prefix;
            this.onPromptSuccess = (line) => {
                res(line);
            };

            this.promptTimeout = setTimeout(() => {
                console.error(`Prompt ${cmd} failed to achieve prefix ${prefix} after ${timeoutMs}ms`);
                rej();
            }, timeoutMs);

            this.write(cmd);
        });
    }

    // kills the process. Must be run when done interacting with the EngineProcess instance.
    public stop(): void {
        if (this.proc){
            this.proc.kill();
            delete this.proc;
            delete this.promptPrefix;
            clearTimeout(this.promptTimeout);
        }
    }

    // returns nothing, can error.
    // feeds the command cmd as the engine's input
    // errors if the process is not currently running
    public write(cmd: string): void {
        if (this.proc){
            const msg = `${cmd}\n`;
            this.log += ` > ${msg}`;
            this.proc?.stdin?.write(msg);
        }else{
            throw new Error("EngineProcess: cannot .write(cmd) when the engine process is not running");
        }
    }
}

// given a dir (path to a folder), returns all of the immediate children files that are .exe
// returns a list of objects: { name, path }
export function getEngines(dir: string): Bot[] {
    const engines: Bot[] = [];
    fs.readdirSync(dir).forEach(fileName => {
        console.log(fileName);
        // shoddy fix for linux
        if (fileName.endsWith(".exe") || fileName.indexOf(".") == -1){
            engines.push({
                name: pathModule.basename(fileName),
                path: pathModule.join(dir, fileName)
            });
        }
    });
    return engines;
}
