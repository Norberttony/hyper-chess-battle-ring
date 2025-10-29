
import { Worker } from "node:worker_threads";

// Wrapper class that handles communicating to the match thread

export class Arbiter {
    constructor(event){
        this.worker = new Worker("./modules/tournament/match-worker.js", { workerData: { event } });

        // calls any functions about general game info
        this.gameListeners = [];
    }

    // white and black are engine objects { name, path }
    // fen is a string
    async playGame(white, black, fen, round, timeControl, path, wdbgPath, bdbgPath){
        console.log(`Starting game ${round}`);
        return new Promise((res, rej) => {
            // listens for when the game ends
            const listener = (msg) => {
                for (const g of this.gameListeners)
                    g(msg);
                if (msg.type == "result"){
                    console.log(`Finished game ${round}`);
                    this.worker.removeListener("message", listener);
                    res(msg);
                }
            }
            this.worker.addListener("message", listener);

            // starts the game on the worker thread
            this.worker.postMessage(
                { white, black, fen, round, timeControl, path, wdbgPath, bdbgPath });
        });
    }

    addGameListener(f){
        this.gameListeners.push(f);
    }

    async terminate(){
        await this.worker.terminate();
    }
}
