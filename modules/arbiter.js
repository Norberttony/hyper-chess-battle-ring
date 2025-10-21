
import { Worker } from "node:worker_threads";

// Wrapper class that handles communicating to the match thread

export class Arbiter {
    constructor(){
        this.worker = new Worker("./match-worker.js");

        // calls any functions about general game info
        this.gameListeners = [];
    }

    async start(whitePath, blackPath, fen){
        return new Promise((res, rej) => {
            // listens for when the game ends
            const listener = (msg) => {
                for (const g of this.gameListeners)
                    g(msg);
                    
                if (msg.type == "result"){
                    this.worker.removeListener("message", listener);
                    res(msg);
                }
            }
            this.worker.addListener("message", listener);

            // starts the game on the worker thread
            this.worker.postMessage({ whitePath, blackPath, fen });
        });
    }

    addGameListener(f){
        this.gameListeners.push(f);
    }
}
