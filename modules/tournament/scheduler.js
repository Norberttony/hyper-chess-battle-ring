
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
        while (this.arbiters.length < threadsAmt){
            const arbiter = new Arbiter(this);
            this.arbiters.push(arbiter);
        }
    }

    #scheduleNextGame(){
        if (this.positions.length == 0)
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

        return true;
    }

    async scheduleGame(arbiter){
        const data = this.getNextGame();
        if (!data)
            return;

        // all of the variables needed to play a game.
        const { white, black, fen, round } = data;
        const tc = this.tournament.timeControl;
        const path = this.tournament.getGamePath(round);
        const wdbgPath = this.tournament.getDebugPath(round, true);
        const bdbgPath = this.tournament.getDebugPath(round, false);

        const res = await arbiter.playGame(white, black, fen, round, tc, path, wdbgPath, bdbgPath);
        this.tournament.record(white.name, black.name, fen, res);

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
    }
}
