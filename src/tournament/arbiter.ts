import { Worker } from "node:worker_threads";
import { Bot, ReadyGame, ScheduledGame, TimeControl } from "./tournament";
import { PathLike } from "node:fs";
import { GameData } from "./game-data";

interface NewGameMsg {
    type: "newgame",
    threadId?: number,
    fen: string,
    white: string,
    black: string
}

interface MoveMsg {
    type: "move",
    threadId?: number,
    lan: string,
    wtime: number,
    btime: number
}

interface ResultMsg {
    type: "result",
    threadId?: number,
    data: GameData
}

export type ArbiterMessage = NewGameMsg | MoveMsg | ResultMsg;

// Wrapper class that handles communicating to the match thread

export class Arbiter {
    private worker: Worker;
    private game: ScheduledGame | undefined = undefined;
    private killGame: () => void = () => 0;

    // calls any functions about general game info
    private gameListeners: ((msg: ArbiterMessage) => any)[] = [];

    constructor(private event: string){
        this.worker = new Worker("./modules/tournament/match-worker.js", { workerData: { event } });
    }

    // white and black are engine objects { name, path }
    // fen is a string
    async playGame(
        scheduled: ScheduledGame,
        white: Bot,
        black: Bot,
        fen: string,
        round: string,
        timeControl: TimeControl,
        path: PathLike,
        wdbgPath: PathLike,
        bdbgPath: PathLike
    ): Promise<ResultMsg> {
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
            const listener = (msg: ArbiterMessage) => {
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
            const game: ReadyGame = { white, black, fen, round, timeControl, path, wdbgPath, bdbgPath };
            this.worker.postMessage(game);
        });
    }

    public addGameListener(f: (msg: ArbiterMessage) => any){
        this.gameListeners.push(f);
    }

    // stops the current game being played
    public async stopGame(){
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
    public async terminate(){
        await this.worker.terminate();
    }

    public getGame(): ScheduledGame | undefined {
        return this.game;
    }
}
