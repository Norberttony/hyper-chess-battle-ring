
import { splitPGNs, extractHeaders } from "hyper-chess-board/pgn";


// Tournament_Results handles maintaining an easy way of retrieving player scores


export class Tournament_Results {
    constructor(players){
        this.results = {};
        this.tempResults = {};
        this.triResults = {};
        this.players = players;

        for (const p of players){
            this.results[p] = {};
            this.triResults[p] = {};
        }

        // get every single pairing...
        for (const p of players){
            for (const o of players){
                if (p == o)
                    continue;

                this.results[p][o] = { ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
                this.results[o][p] = { ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
                this.triResults[p][o] = { wins: 0, draws: 0, losses: 0 };
                this.triResults[o][p] = { wins: 0, draws: 0, losses: 0 };
            }
        }
    }

    getScore(p){
        let totalScore = 0;
        let totalMaxScore = 0;
        for (const o of this.players){
            if (p == o)
                continue;

            const { score, maxScore } = this.getScoreAgainst(p, o);
            totalScore += score;
            totalMaxScore += maxScore;
        }
        return { totalScore, totalMaxScore };
    }

    getScoreAgainst(p, o){
        const entry = this.results[p][o];
        const score = 2 * entry.ww + 1.5 * entry.wd + entry.dd + 0.5 * entry.ld;
        const maxScore = 2 * (entry.ww + entry.wd + entry.dd + entry.ld + entry.ll);
        return { score, maxScore };
    }

    getResults(p){
        const results = { ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
        for (const o of this.players){
            if (p == o)
                continue;

            const { ww, wd, dd, ld, ll } = this.getResultsAgainst(p, o);
            results.ww += ww;
            results.wd += wd;
            results.dd += dd;
            results.ld += ld;
            results.ll += ll;
        }
        return results;
    }

    getWDLResults(p){
        const results = { wins: 0, draws: 0, losses: 0 };
        for (const o of this.players){
            if (p == o)
                continue;

            const { wins, draws, losses } = this.getWDLResultsAgainst(p, o);
            results.wins += wins;
            results.draws += draws;
            results.losses += losses;
        }
        return results;
    }

    addGame(pgn){
        const headers = extractHeaders(pgn);
        const round = headers.Round;
        let winner = 0;
        if (headers.Result == "1-0")
            winner = headers.White;
        else if (headers.Result == "0-1")
            winner = headers.Black;
        this.addResult(headers.White, headers.Black, round, winner);
        return true;
    }

    // gets results of how well p did against o
    getResultsAgainst(p, o){
        return this.results[p][o];
    }

    getWDLResultsAgainst(p, o){
        return this.triResults[p][o];
    }

    addWW(p, o){
        this.results[p][o].ww++;
        this.results[o][p].ll++;
    }

    addWD(p, o){
        this.results[p][o].wd++;
        this.results[o][p].ld++;
    }

    addDD(p, o){
        this.results[p][o].dd++;
        this.results[o][p].dd++;
    }

    addDL(p, o){
        this.results[p][o].ld++;
        this.results[o][p].wd++;
    }

    addLL(p, o){
        this.results[p][o].ll++;
        this.results[o][p].ww++;
    }

    addResult(p, o, round, winner){
        round = round.split(".")[0];

        // update trinomial results
        if (p == winner){
            this.triResults[p][o].wins++;
            this.triResults[o][p].losses++;
        }else if (o == winner){
            this.triResults[o][p].wins++;
            this.triResults[p][o].losses++;
        }else if (winner == 0){
            this.triResults[p][o].draws++;
            this.triResults[o][p].draws++;
        }

        const val = this.tempResults[round];
        if (val){
            if (!(val.p == o && val.o == p || val.p == p && val.o == o))
                return false;

            // add result from this game
            let points = 0;
            if (p == winner)
                points++;
            else if (winner == 0)
                points += 0.5;

            // add result from the other game
            if (val.winner == p)
                points++;
            else if (val.winner == 0)
                points += 0.5;

            // determine which metric to add based on point count
            if (points == 0)
                this.addLL(p, o);
            else if (points == 0.5)
                this.addDL(p, o);
            else if (points == 1)
                this.addDD(p, o);
            else if (points == 1.5)
                this.addWD(p, o);
            else if (points == 2)
                this.addWW(p, o);

            delete this.tempResults[round];
        }else{
            this.tempResults[round] = { p, o, winner };
        }
        return true;
    }

    // takes in a pgnStr and extracts all of the results
    readPGN(pgnStr){
        let ignored = 0;
        const pgns = splitPGNs(pgnStr);
        for (const pgn of pgns){
            if (!this.addGame(pgn))
                ignored++;
        }
        ignored += Object.keys(this.tempResults).length;

        return { ignored, gameCount: pgns.length };
    }
}
