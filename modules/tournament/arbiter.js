
import { Worker } from "node:worker_threads";

// Wrapper class that handles communicating to the match thread

export class Arbiter {
    constructor(event){
        this.event = event;
        this.worker = new Worker("./modules/tournament/match-worker.js", { workerData: { event } });

        this.game = undefined;
        this.killGame = () => 0;

        // calls any functions about general game info
        this.gameListeners = [];
    }

    // white and black are engine objects { name, path }
    // fen is a string
    async playGame(scheduled, white, black, fen, round, timeControl, path, wdbgPath, bdbgPath){
        if (this.game)
            throw new Error("Arbiter tried to play two games at once");
        console.log(`Starting game ${round}`);
        this.game = scheduled;
        return new Promise((res, rej) => {
            // trigger new game
            for (const g of this.gameListeners)
                g({ type: "newgame", fen, white: white.name, black: black.name });

            this.killGame = () => rej("Game was stopped");

            // listens for when the game ends
            const listener = (msg) => {
                for (const g of this.gameListeners)
                    g(msg);
                if (msg.type == "result"){
                    console.log(`Finished game ${round}`);
                    delete this.game;
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

    // stops the current game being played
    async stopGame(){
        if (!this.game)
            return;

        delete this.game;
        // a new worker is created before terminating because otherwise there's effectively a
        // dangling pointer (ie. a reference to a terminated worker).
        const w = this.worker;
        this.worker = new Worker("./modules/tournament/match-worker.js", {
            workerData: { event: this.event }
        });
        this.killGame();
        await w.terminate();
    }

    // kills the thread used by the arbiter
    async terminate(){
        await this.worker.terminate();
    }
}
