
import fs from "fs";
import pathModule from "path"

import { SPRT } from "./analyze.mjs";
import { Game_Logger } from "./logger.mjs";
import { TaskManager } from "./task-manager.mjs";
import { Move } from "../viewer/scripts/game/move.mjs";


export class Tournament_Handler {
    #players;

    constructor(oldVersion, newVersion, usePrevious = true){
        this.#players = [ oldVersion, newVersion ];
        this.playing = false;
        this.activeGamesCount = 0;

        // initializes results
        this.results = {};
        for (const p of this.#players){
            this.results[p.name] = {};
        }
        for (const p1 of this.#players){
            for (const p2 of this.#players){
                if (p1 == p2)
                    continue;
                this.results[p1.name][p2.name] = { wins: 0, draws: 0, losses: 0 };
                this.results[p2.name][p1.name] = { wins: 0, draws: 0, losses: 0 };
            }
        }

        // initialize positions
        this.positions = JSON.parse(fs.readFileSync("./data/positions.json").toString());

        this.name = Object.assign([], this.#players.map((v) => v.name)).sort().join("__vs__");
        
        this.path = pathModule.join("./data/tournaments", this.name);
        this.resultsPath = pathModule.join(this.path, "results.json");
        this.positionsPath = pathModule.join(this.path, "positions.json");

        if (!fs.existsSync(this.path)){
            // create a new tournament at this path.
            fs.mkdirSync(this.path);
        }

        // if not intending to use previous results, this will overwrite them.
        if (!usePrevious || !fs.existsSync(this.resultsPath) || !fs.existsSync(this.positionsPath)){
            fs.writeFileSync(this.resultsPath, JSON.stringify(this.results));
            fs.writeFileSync(this.positionsPath, JSON.stringify(this.positions));
        }

        // read data from previous tournament (if existed)
        if (usePrevious){
            this.positions = JSON.parse(fs.readFileSync(this.positionsPath).toString());
            this.results = JSON.parse(fs.readFileSync(this.resultsPath).toString());
        }

        this.logger = new Game_Logger(this.name);
        const res = this.results[this.#players[0].name][this.#players[1].name];
        this.logger.gameId = res.wins + res.draws + res.losses;
    }

    save(){
        const resultsPath = this.resultsPath;
        fs.writeFileSync(resultsPath, JSON.stringify(this.results));

        const positionsPath = this.positionsPath;
        fs.writeFileSync(positionsPath, JSON.stringify(this.positions));
    }

    start(threadAmt){
        if (this.playing)
            return console.warn(`Tournament ${this.name} has already started.`);
        console.log(`Starting ${this.name} with ${threadAmt} threads`);

        const workerData = {
            e1Name: this.#players[0].name,
            e1Path: this.#players[0].path,
            e2Name: this.#players[1].name,
            e2Path: this.#players[1].path
        }
        this.matchManager = new TaskManager("./modules/match-worker.mjs", threadAmt, workerData);
        this.playing = true;

        for (let i = 0; i < threadAmt; i++){
            this.#startThread();
        }
    }

    stop(){
        this.playing = false;
    }

    // internal method for starting a parallel thread that will handle playing games.
    #startThread(){
        if (this.positions.length == 0)
            return console.warn("Cannot continue thread; out of positions");

        this.activeGamesCount++;
        this.playRound()
            .then(() => {
                this.activeGamesCount--;
                // perform SPRT to see if must play more games
                const results = this.results[this.#players[1].name][this.#players[0].name];
                const hyp = SPRT(results.wins, results.draws, results.losses, 0, -5, 0.01, 0.01);
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
    }

    getUnplayedPosition(){
        if (this.positions.length == 0)
            throw new Error("Out of positions!");
        const idx = Math.floor(Math.random() * this.positions.length);
        return this.positions.splice(idx, 1)[0];
    }

    recordResult(white, black, winner){
        if (winner == 0){
            this.results[white.name][black.name].draws++;
            this.results[black.name][white.name].draws++;
        }else if (white.path == winner.path){
            this.results[white.name][black.name].wins++;
            this.results[black.name][white.name].losses++;
        }else if (black.path == winner.path){
            this.results[black.name][white.name].wins++;
            this.results[white.name][black.name].losses++;
        }else{
            console.warn("Could not interpret winner: ", winner);
        }
    }

    async playRound(){
        const pos = this.getUnplayedPosition();

        return this.matchManager.doTask(pos)
            .then((jsonData) => {
                const [ g1, g2 ] = JSON.parse(jsonData);

                // recreate moves
                for (let m = 0; m < g1.moves.length; m++)
                    g1.moves[m] = new Move(g1.moves[m].to, g1.moves[m].from, g1.moves[m].captures);
                for (let m = 0; m < g2.moves.length; m++)
                    g2.moves[m] = new Move(g2.moves[m].to, g2.moves[m].from, g2.moves[m].captures);

                this.logger.logDouble(g1, g2);

                // record results
                this.recordResult(this.#players[0], this.#players[1], g1.winner);
                this.recordResult(this.#players[1], this.#players[0], g2.winner);
                this.displayResults();

                this.save();
            });
    }

    displayResults(){
        const e1n = this.#players[0].name;
        const e2n = this.#players[1].name;
        console.log(`${e1n} | ${this.results[e1n][e2n].wins} - ${this.results[e1n][e2n].draws} - ${this.results[e1n][e2n].losses} | ${e2n}`);
    }
}
