
export class Tournament_Results {
    constructor(players){
        this.results = {};
        this.players = players;

        for (const p of players)
            this.results[p] = {};

        // get every single pairing...
        for (const p of players){
            for (const o of players){
                if (p == o)
                    continue;

                this.results[p][o] = { wins: 0, draws: 0, losses: 0};
                this.results[o][p] = { wins: 0, draws: 0, losses: 0};
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
        const score = entry.wins + entry.draws * 0.5;
        const maxScore = entry.wins + entry.draws + entry.losses;
        return { score, maxScore };
    }

    getResults(p){
        const results = { wins: 0, draws: 0, losses: 0 };
        for (const o of this.players){
            if (p == o)
                continue;

            const { wins, draws, losses } = this.getResultsAgainst(p, o);
            results.wins += wins;
            results.draws += draws;
            results.losses += losses;
        }
        return results;
    }

    // gets results of how well p did against o
    getResultsAgainst(p, o){
        return this.results[p][o];
    }

    addWin(p, o){
        this.results[p][o].wins++;
        this.results[o][p].losses++;
    }

    addDraw(p, o){
        this.results[p][o].draws++;
        this.results[o][p].draws++;
    }

    addLoss(p, o){
        this.results[p][o].losses++;
        this.results[o][p].wins++;
    }
}
