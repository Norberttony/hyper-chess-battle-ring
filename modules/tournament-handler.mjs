
import fs from "fs";
import pathModule from "path"

import { SPRT } from "./analyze.mjs";
import { getAllPositions } from "./fetch-pos.mjs";
import { startADouble } from "./match-handler.mjs";
import { Game_Logger } from "./logger.mjs";


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
        this.positions = getAllPositions();

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
            fs.writeFileSync(this.positionsPath, JSON.stringify(getAllPositions()));
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

        this.playing = true;

        for (let i = 0; i < threadAmt; i++){
            this.startThread();
        }
    }

    stop(){
        this.playing = false;
    }

    startThread(){
        if (!this.playing)
            return console.warn("Use Tournament_Handler.start instead of manually starting threads.");

        this.activeGamesCount++;
        this.playRound()
            .then(() => {
                this.activeGamesCount--;
                // perform SPRT to see if must play more games
                const results = this.results[this.#players[1].name][this.#players[0].name];
                const hyp = SPRT(results.wins, results.draws, results.losses, 0, 20, 0.01, 0.01);
                if (hyp){
                    console.log(`SPRT goal reached, allowing final ${this.activeGamesCount} game(s) to finish...`);
                    this.stop();
                    return;
                }

                if (this.playing){
                    this.startThread();
                }else{
                    if (this.activeGamesCount)
                        console.log(`Waiting for ${this.activeGamesCount} game(s) to finish...`);
                    else
                        console.log("Final game finished!");
                }
            });
    }

    getUnplayedPosition(){
        if (this.positions.length == 0)
            throw new Error("Out of positions!");
        const idx = Math.floor(Math.random() * this.positions.length);
        return this.positions.splice(idx, 1)[0];
    }

    recordResult(white, black, winner, pos){
        if (winner == 0){
            this.results[white.name][black.name].draws++;
            this.results[black.name][white.name].draws++;
            pos.draws++;
        }else if (white == winner){
            this.results[white.name][black.name].wins++;
            this.results[black.name][white.name].losses++;
            pos.whiteWins++;
        }else if (black == winner){
            this.results[black.name][white.name].wins++;
            this.results[white.name][black.name].losses++;
            pos.blackWins++;
        }
    }

    playRound(){
        return new Promise(async (res, rej) => {
            let pos;

            try {
                pos = this.getUnplayedPosition();
            }
            catch(err){
                rej(err);
            }

            // play some games
            const [ g1, g2 ] = await startADouble(this.#players[0], this.#players[1], pos.fen, this.logger);

            // record results
            this.recordResult(this.#players[0], this.#players[1], g1.winner, pos);
            this.recordResult(this.#players[1], this.#players[0], g2.winner, pos);
            this.displayResults();

            this.save();

            res();
        });
    }

    displayResults(){
        const e1n = this.#players[0].name;
        const e2n = this.#players[1].name;
        console.log(`${e1n} | ${this.results[e1n][e2n].wins} - ${this.results[e1n][e2n].draws} - ${this.results[e1n][e2n].losses} | ${e2n}`);
    }
}
