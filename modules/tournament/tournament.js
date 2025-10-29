
import pathModule from "node:path";
import fs from "node:fs";

import { extractHeaders, splitPGNs } from "hyper-chess-board/pgn";

import { buildStructure } from "../utils/file.js";
import { pentaSPRT } from "../stats/penta-sprt.js";
import { testLLR } from "../stats/sprt.js";
import { convertGameDataToPGN } from "./game-data.js";

// Directly deals with file management, player add/remove, results management, and logging to the
// terminal.

const defaultConfig = {
    timeControl: { time: 8000, inc: 80 },
    players: [],
    sprt: { h0: 0, h1: 10, alpha: 0.05, beta: 0.05 }
};

const tournamentStructure = {
    debug: {},
    games: {
        "00_compiled_games.pgn": ""
    },
    "config.json": JSON.stringify(defaultConfig),
    "data.json": `{"rounds": 0}`,
    "schedule.json": "[]"
};

export class Tournament {
    constructor(name){
        this.name = name;
        this.root = pathModule.join(`./data/tournaments/${name}`);

        buildStructure(tournamentStructure, this.root);

        this.results = {};

        // specifically for keeping track of pentamonial
        this.halfResults = {};

        this.positions = this.readPositions();
        this.config = this.readConfig();
        this.data = this.readData();

        // read in the players
        for (const p of this.config.players)
            this.#initPlayer(p);

        // read in the games from a file
        this.compiledPath = pathModule.join(this.root, "games", "00_compiled_games.pgn");
        const compiledGames = fs.readFileSync(this.compiledPath).toString();
        for (const pgn of splitPGNs(compiledGames))
            this.recordGame(pgn);
    }

    get timeControl(){
        return this.config.timeControl;
    }

    get players(){
        return this.config.players;
    }

    get sprt(){
        return this.config.sprt;
    }

    getGamePath(round){
        return pathModule.join(this.root, "games", `${round}_game.pgn`);
    }

    getDebugPath(round, isWhite){
        return pathModule.join(this.root, "debug", `${round}_${isWhite ? "white" : "black"}.txt`);
    }

    getNextRound(){
        const r = this.data.rounds++;
        this.saveData();
        return r;
    }

    #readJSON(pathFromRoot){
        return JSON.parse(fs.readFileSync(pathModule.join(this.root, pathFromRoot)).toString());
    }

    #writeJSON(pathFromRoot, data){
        fs.writeFileSync(pathModule.join(this.root, pathFromRoot), JSON.stringify(data));
    }

    readSchedule(){
        return this.#readJSON("schedule.json");
    }

    readPositions(){
        return this.#readJSON("positions.json");
    }

    readData(){
        return this.#readJSON("data.json");
    }

    readConfig(){
        return this.#readJSON("config.json");
    }

    writeSchedule(schedule){
        this.#writeJSON("schedule.json", schedule);
    }

    writePositions(positions){
        this.#writeJSON("positions.json", positions);
    }

    saveConfig(){
        this.#writeJSON("config.json", this.config);
    }

    saveData(){
        this.#writeJSON("data.json", this.data);
    }

    // expects { name, path }
    // Adds a player to the set of existing players.
    addPlayer(engine){
        // check if this player has already been added
        for (const { path } of this.players){
            if (path == engine.path)
                return;
        }

        this.players.push(engine);
        this.#initPlayer(engine);
    }

    // expects { name, path }
    // Initializes the player
    #initPlayer(engine){
        this.results[engine.name] = {};
    }

    playedGame(gameData){
        this.record(gameData.white.name, gameData.black.name, gameData.fen, gameData.result.result);

        const pgn = convertGameDataToPGN(gameData);
        fs.appendFileSync(this.compiledPath, "\n" + pgn + "\n");
    }

    getEntry(name, oppName){
        let entry = this.results[name][oppName];
        if (!entry){
            entry = { w: 0, d: 0, l: 0, ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
            this.results[name][oppName] = entry;
        }
        return entry;
    }

    getWhiteScore(result){
        if (result == "1-0")
            return 1;
        else if (result == "1/2-1/2")
            return 0.5;
        else
            return 0;
    }

    recordGame(pgn){
        const headers = extractHeaders(pgn);
        this.record(headers.White, headers.Black, headers.FEN, headers.Result);
    }

    record(whiteName, blackName, fen, result){
        const entry = this.getEntry(whiteName, blackName);
        const oppEntry = this.getEntry(blackName, whiteName);

        const whitePoints = this.getWhiteScore(result);

        // WDL records
        if (whitePoints == 1){
            entry.w++;
            oppEntry.l++;
        }else if (whitePoints == 0.5){
            entry.d++;
            oppEntry.d++;
        }else if (whitePoints == 0){
            entry.l++;
            oppEntry.w++;
        }

        // pentamonial records, which are only supported via 2-player tournaments
        if (this.players.length == 2){
            const f = this.halfResults[fen];
            if (f && f.blackName == whiteName && f.whiteName == blackName){
                // same game but colors reversed, record into penta
                const whiteDblPoints = whitePoints + 1 - this.getWhiteScore(f.result);
                if (whiteDblPoints == 2){
                    entry.ww++;
                    oppEntry.ll++;
                }else if (whiteDblPoints == 1.5){
                    entry.wd++;
                    oppEntry.ld++;
                }else if (whiteDblPoints == 1){
                    entry.dd++;
                    oppEntry.dd++;
                }else if (whiteDblPoints == 0.5){
                    entry.ld++;
                    oppEntry.wd++;
                }else if (whiteDblPoints == 0){
                    entry.ll++;
                    oppEntry.ww++;
                }
                
                delete this.halfResults[fen];
            }else{
                this.halfResults[fen] = { whiteName, blackName, result };
            }
        }
    }

    getScoreAgainst(name, oppName){
        const { w, d } = getEntry(name, oppName);
        return w + 0.5 * d;
    }

    // given the player name,
    // returns an object containing the score achieved by the player, and the maxScore the player
    // could have achieved: { score, maxScore }
    getScore(name){
        let score = 0;
        let maxScore = 0;
        for (const { w, d, l } of Object.values(this.results[name])){
            score += w + 0.5 * d;
            maxScore += w + d + l;
        }
        return { score, maxScore };
    }

    getWDL(name){
        const r = { w: 0, d: 0, l: 0 };
        for (const { w, d, l } of Object.values(this.results[name])){
            r.w += w;
            r.d += d;
            r.l += l;
        }
        return r;
    }

    getPenta(name){
        const r = { ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
        for (const { ww, wd, dd, ld, ll } of Object.values(this.results[name])){
            r.ww += ww;
            r.wd += wd;
            r.dd += dd;
            r.ld += ld;
            r.ll += ll;
        }
        return r;
    }

    getPentaLLR({ ww, wd, dd, ld, ll }, elo0, elo1){
        return pentaSPRT(ll, ld, dd, wd, ww, elo0, elo1);
    }

    // gets the worst-case scenario for a pentamonial score
    getWorstCasePenta(name){
        const r = this.getPenta(name);

        // goes through half results...
        for (const { whiteName, blackName, result } of Object.values(this.halfResults)){
            let s;
            if (whiteName == name)
                s = this.getWhiteScore(result);
            else if (blackName == name)
                s = 1 - this.getWhiteScore(result);
            else
                continue;

            if (s == 0)
                r.ll++;
            else if (s == 0.5)
                r.dl++;
            else if (s == 1)
                r.dd++;
        }
        return r;
    }

    // gets the best-case scenario for a pentamonial score
    getBestCasePenta(name){
        const r = this.getPenta(name);

        // goes through half results...
        for (const { whiteName, blackName, result } of Object.values(this.halfResults)){
            let s;
            if (whiteName == name)
                s = this.getWhiteScore(result);
            else if (blackName == name)
                s = 1 - this.getWhiteScore(result);
            else
                continue;

            if (s == 0)
                r.dd++;
            else if (s == 0.5)
                r.wd++;
            else if (s == 1)
                r.ww++;
        }
        return r;
    }

    // logs a report to the terminal
    report(){
        const [ p1, p2 ] = this.players;

        const { h0, h1, alpha, beta } = this.sprt;
        const { ll, ld, dd, wd, ww, w, d, l } = this.getEntry(p1.name, p2.name);
        const llr = pentaSPRT(ll, ld, dd, wd, ww, h0, h1);
        const hyp = testLLR(llr, alpha, beta) || "inconclusive";

        console.log(`${w + d + l} games played`);
        console.log(`WDL ${w} - ${d} - ${l}`);
        console.log(`Penta (${ll}, ${ld}, ${dd}, ${wd}, ${ww})`);
        console.log(`LLR: ${llr.toFixed(5)} (${hyp})`);
    }
}
