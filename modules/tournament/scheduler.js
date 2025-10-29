
import fs from "node:fs";

import { testLLR } from "../stats/sprt.js";
import { pentaSPRT } from "../stats/penta-sprt.js";
import { Arbiter } from "./arbiter.js";

// Directly deals with managing threads, recording results, 

export class Scheduler {
    constructor(tournament){
        this.tournament = tournament;
        this.threadsAmt = 0;

        // create threads
        this.conclusion;
        this.paused = false;
        this.positions = tournament.readPositions();
        this.schedule = tournament.readSchedule();
        this.unpickedSchedule = [ ...this.schedule ];
        this.arbiters = [];
    }

    start(threadsAmt){
        // ensure all engines are here
        const missing = [];
        for (const { path } of this.tournament.players){
            if (!fs.existsSync(path))
                missing.push(path);
        }
        if (missing.length > 0)
            throw new Error(`Detected missing engine(s): ${missing.join(", ")}`);
        
        while (this.arbiters.length < threadsAmt){
            const arbiter = new Arbiter(this.tournament.name);
            this.arbiters.push(arbiter);
            this.scheduleGame(arbiter);
        }
    }

    #scheduleNextGame(){
        if (this.positions.length == 0 || this.conclusion)
            return false;
        
        // fetch a random position
        const idx = Math.floor(this.positions.length * Math.random());
        const fen = this.positions.splice(idx, 1)[0];
        this.tournament.writePositions(this.positions);

        // add double (play normal, then with colors reversed) to schedule
        const [ p1, p2 ] = this.tournament.players;
        const r = this.tournament.getNextRound();
        const game1 = {
            white: p1,
            black: p2,
            fen,
            round: `${r}.1`
        };

        const game2 = {
            white: p2,
            black: p1,
            fen,
            round: `${r}.2`
        };

        this.schedule.push(game1, game2);
        this.unpickedSchedule.push(game1, game2);

        this.tournament.writeSchedule(this.schedule);

        return true;
    }

    async scheduleGame(arbiter){
        if (this.conclusion)
            return;

        const data = this.getNextGame();
        if (!data)
            return;

        // all of the variables needed to play a game.
        const { white, black, fen, round } = data;
        const tc = this.tournament.timeControl;
        const path = this.tournament.getGamePath(round);
        const wdbgPath = this.tournament.getDebugPath(round, true);
        const bdbgPath = this.tournament.getDebugPath(round, false);

        const msg = await arbiter.playGame(white, black, fen, round, tc, path, wdbgPath, bdbgPath);
        this.tournament.playedGame(msg.data);

        // remove the game from the schedule
        this.schedule.splice(this.schedule.indexOf(data), 1);
        this.tournament.writeSchedule(this.schedule);

        if (!this.conclusion)
            this.checkForConclusion();

        // let's play another :D
        // also, weird trick with setTimeout just to avoid dealing with stack overflow.
        setTimeout(() => this.scheduleGame(arbiter), 100);
    }

    getNextGame(){
        if (this.unpickedSchedule.length == 0){
            // if there's a result, no more games.
            if (this.conclusion || this.paused)
                return undefined;

            // otherwise add a game to the schedule
            if (!this.#scheduleNextGame())
                return;
        }
        return this.unpickedSchedule.splice(0, 1)[0];
    }

    checkForConclusion(){
        // runs SPRT...
        // if result, we either wait for the second half of the doubles to finish. If there aren't
        // any, we just cancel all arbiters.
        const p1 = this.tournament.players[0];
        const { h0, h1, alpha, beta } = this.tournament.sprt;
        const worstPenta = this.tournament.getWorstCasePenta(p1.name);
        const bestPenta = this.tournament.getBestCasePenta(p1.name);

        const worstLLR = this.tournament.getPentaLLR(worstPenta, h0, h1);
        const bestLLR = this.tournament.getPentaLLR(bestPenta, h0, h1);

        console.log(worstLLR, bestLLR);
        this.tournament.report();

        if (testLLR(worstLLR, alpha, beta) == "H1"){
            this.conclusion = "H1";
            console.log("Accepted H1");
        }else if (testLLR(bestLLR, alpha, beta) == "H0"){
            this.conclusion = "H0";
            console.log("Accepted H0");
        }

        if (this.conclusion){
            // find all scheduled doubles and remove them from the schedule
            const fenDict = {};
            for (let i = 0; i < this.unpickedSchedule.length; i++){
                const fen = this.unpickedSchedule[i].fen;
                if (fenDict[fen]){
                    // aha! a double!
                    this.unpickedSchedule.splice(i, 1);
                    this.unpickedSchedule.splice(fenDict[fen], 1);
                    i -= 2;
                }else{
                    fenDict[fen] = i;
                }
            }
        }
    }
}
