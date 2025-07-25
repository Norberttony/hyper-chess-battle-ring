
import { SPRT } from "./analyze.mjs";
import { TaskManager } from "./task-manager.mjs";
import { Move } from "hyper-chess-board";
import { convertGameDataToPGN } from "./game-data.mjs";


export class Tournament_Handler {
    #players;

    constructor(files){
        this.files = files;
        this.playing = false;
        this.activeGamesCount = 0;

        // initialize positions
        this.positions = files.readPositions();

        this.inProgressRounds = [];
    }

    save(){
        this.files.files.positions.writeSync(JSON.stringify(this.positions));
    }

    start(threadAmt){
        if (this.playing)
            return console.warn(`Tournament ${this.files.name} has already started.`);
        console.log(`Starting ${this.files.name} with ${threadAmt} threads`);

        this.#players = this.files.getEngines();
        
        // initializes results
        this.results = this.files.getResults();
        
        if (this.#players.length != 2)
            throw new Error("Handler only supports 2-player tournaments");

        const workerData = {
            e1Name: this.#players[0].name,
            e1Path: this.#players[0].path,
            e2Name: this.#players[1].name,
            e2Path: this.#players[1].path,
            timeControl: JSON.parse(JSON.stringify(this.files.config.getTC()))
        };
        this.matchManager = new TaskManager("./modules/match-worker.mjs", threadAmt, workerData);
        this.playing = true;

        for (let i = 0; i < threadAmt; i++){
            this.#startThread();
        }
    }

    async stop(){
        this.playing = false;
        await Promise.allSettled(this.inProgressRounds);
    }

    // internal method for starting a parallel thread that will handle playing games.
    #startThread(){
        if (this.positions.length == 0)
            return console.warn("Cannot continue thread; out of positions");

        this.activeGamesCount++;
        const promise = this.playRound()
            .then(() => {
                this.inProgressRounds.splice(this.inProgressRounds.indexOf(promise), 1);
                this.activeGamesCount--;

                // perform SPRT to see if must play more games
                const results = this.results.getResultsAgainst(this.#players[0].name, this.#players[1].name);
                const { h0, h1, alpha, beta } = this.files.config.getModeConfig();
                const hyp = SPRT(results.wins, results.draws, results.losses, h0, h1, alpha, beta);
                if (hyp){
                    console.log(`SPRT goal reached, allowing final ${this.activeGamesCount} game(s) to finish...`);
                    this.stop();
                    return;
                }

                if (this.playing){
                    this.#startThread();
                }else{
                    if (this.activeGamesCount){
                        console.log(`Waiting for ${this.activeGamesCount} game(s) to finish...`);
                    }else{
                        console.log("Final game finished!");
                    }
                }
            });
        
        this.inProgressRounds.push(promise);
    }

    #getUnplayedPosition(){
        if (this.positions.length == 0)
            throw new Error("Out of positions!");
        const idx = Math.floor(Math.random() * this.positions.length);
        return this.positions.splice(idx, 1)[0];
    }

    recordResult(white, black, winner){
        if (winner == 0){
            this.results.addDraw(white.name, black.name);
        }else if (white.path == winner.path){
            this.results.addWin(white.name, black.name);
        }else if (black.path == winner.path){
            this.results.addWin(black.name, white.name);
        }else{
            console.warn("Could not interpret winner: ", winner);
        }
    }

    async playRound(){
        const pos = this.#getUnplayedPosition();

        return this.matchManager.doTask(pos)
            .then((games) => {
                for (const gd of games){
                    // recreate moves
                    for (let m = 0; m < gd.moves.length; m++){
                        const move = gd.moves[m];
                        gd.moves[m] = new Move(move.to, move.from, move.captures);
                    }

                    const pgn = convertGameDataToPGN(gd, this.files.gameId, this.files.name);
                    this.files.saveGame(pgn, gd.whiteLog, gd.blackLog);

                    // record results
                    this.recordResult(gd.white, gd.black, gd.winner);
                }

                this.displayResults();

                this.save();
            });
    }

    displayResults(){
        const e1n = this.#players[0].name;
        const e2n = this.#players[1].name;
        const entry = this.results.getResultsAgainst(e1n, e2n);
        console.log(`${e1n} | ${entry.wins} - ${entry.draws} - ${entry.losses} | ${e2n}`);
    }
}
