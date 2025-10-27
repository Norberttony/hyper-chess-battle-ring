
import { Arbiter } from "./arbiter.js";

// Directly deals with managing threads, recording results, 

export class Scheduler {
    constructor(threads){
        this.threads = threads;

        this.conclusion;
        this.paused = false;
        this.schedule = [];
        this.unpickedSchedule = [];
        this.arbiters = [];
        for (let i = 0; i < threads; i++){
            const arbiter = new Arbiter(this);
            this.arbiters.push(arbiter);
        }
    }

    getNextGame(){
        if (this.unpickedSchedule.length == 0){
            // if there's a result, no more games.
            if (this.conclusion || this.paused)
                return undefined;

            // otherwise add a game to the schedule...
        }
        return this.unpickedSchedule.splice(0, 1)[0];
    }

    checkForConclusion(){
        // runs SPRT...
        // if result, we either wait for the second half of the doubles to finish. If there aren't
        // any, we just cancel all arbiters.
    }
}
