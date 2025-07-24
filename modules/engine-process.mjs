
import { spawn } from "child_process";


// Creates an engine process (wrapper class around a live executable) that is capable of feeding
// input into the executable and returning output from the engine .exe file.
export class EngineProcess {
    constructor(engine, onReadLine = () => 0){
        this.engine = engine;
        this.proc = spawn(this.engine.path);

        this.onReadLine = onReadLine;

        // for prompt
        this.promptPrefix;
        this.onPromptSuccess;
        this.promptTimeout;

        // log is all of the input/output to/from the engine so far
        // input is indexed by a " > " before the line.
        this.log = "";

        // broken keeps track of "broken" lines (see #getLines)
        this.broken = "";

        this.proc.stdout.on("data", (data) => {
            this.#getLines(data.toString());
        });

        this.proc.on("error", (err) => {
            throw new Error(err);
        });
    }

    // internal function that separates out stdout into complete lines.
    #getLines(stdoutData){
        // stdout data might have multiple lines, and the last line might be cut off.
        const lines = (this.broken + stdoutData).split("\r\n");
        if (!stdoutData.endsWith("\r\n") || lines[lines.length - 1] == "")
            this.broken = lines.pop();

        for (const l of lines){
            this.log += `${l}\n`;
            this.onReadLine(l);
            if (this.promptPrefix && l.startsWith(this.promptPrefix)){
                this.onPromptSuccess(l);
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
    prompt(cmd, prefix, timeoutMs = 10000){
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
    stop(){
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
    write(cmd){
        if (this.proc){
            const msg = `${cmd}\n`;
            this.log += ` > ${msg}`;
            this.proc.stdin.write(msg);
        }else{
            throw new Error("EngineProcess: cannot .write(cmd) when the engine process is not running");
        }
    }
}
