
import pathModule from "node:path";

import { extractHeaders, splitPGNs } from "hyper-chess-board/pgn";
import { Tournament_Results } from "./tournament-results.mjs";
import { extractEngines } from "./engine.mjs";
import { File_Obj, Dir_Obj } from "./fs-obj.mjs";
import { logWarn } from "./logger.mjs";
import { Tournament_Config } from "./tournament-config.mjs";


const botsPath = pathModule.resolve(".", "bots");

export class Tournament_Files {
    constructor(name){
        this.name = name;

        const tPath = pathModule.resolve(".", "data", "tournaments", name);
        this.files = {
            "allPositions": new File_Obj([ ".", "data", "positions.json" ]),
            "gamesDir":     new  Dir_Obj([ tPath, "games" ]),
            "debugDir":     new  Dir_Obj([ tPath, "debug" ]),
            "games":        new File_Obj([ tPath, "games", "00_compiled_games.pgn" ]),
            "positions":    new File_Obj([ tPath, "positions.json" ]),
            "config":       new File_Obj([ tPath, "config.json" ])
        };

        // initialize dirs first
        for (const o of Object.values(this.files)){
            if (o.type == "dir")
                o.init();
        }

        // if there is no positions.json BUT we haven't played any games (so we haven't used
        // positions.json) we just copy it over.
        this.files.games.init();
        this.gameCount = splitPGNs(this.files.games.readSync()).length;
        this.gameId = this.gameCount;
        if (this.gameCount == 0)
            this.files.positions.init(this.files.allPositions.readSync());

        // set up tournament configuration
        this.config = new Tournament_Config(this.files.config);

        // initialize all of the files
        for (const o of Object.values(this.files)){
            if (o.type == "file")
                o.init();
        }
    }

    // returns the name of every tournament
    static getTournamentNames(){
        const tDir = new Dir_Obj([ ".", "data", "tournaments" ]);
        return tDir.contents().filter(v => v.type == "dir").map(v => v.getName());
    }

    // returns a promise fetches the game matching id and resolves with an object of the form
    // { gamePgn, whiteDebug, blackDebug } where gamePgn is the PGN as a string, and whiteDebug
    // and blackDebug correspond to the engine's logs during the game.
    async getGame(id){
        return new Promise((res, rej) => {
            const gamePgnF = this.files.gamesDir.join(`${id}_game.pgn`, "file");
            const whiteDebugF = this.files.debugDir.join(`${id}_white.txt`, "file");
            const blackDebugF = this.files.debugDir.join(`${id}_black.txt`, "file");

            Promise.all([ gamePgnF.read(), whiteDebugF.read(), blackDebugF.read() ])
                .then(([ gamePgn, whiteDebug, blackDebug ]) =>
                    res({ gamePgn, whiteDebug, blackDebug }))
                .catch(err => rej(err));
        });
    }

    // saves the given game into the tournament files
    saveGame(pgn, whiteDebug, blackDebug){
        const id = this.gameId++;
        this.files.gamesDir.joinFile(`${id}_game.pgn`).writeSync(pgn);
        this.files.games.appendSync(`\n${pgn}\n`);
        this.gameCount++;

        this.files.debugDir.joinFile(`${id}_white.txt`).write(whiteDebug);
        this.files.debugDir.joinFile(`${id}_black.txt`).write(blackDebug);
    }

    getEngines(){
        const players = this.config.getPlayers();
        const allEngines = extractEngines(botsPath);
        
        // maintain same order, for players and engines
        const engines = [];
        for (const p of players){
            let found = false;
            for (const e of allEngines){
                if (e.name == p){
                    engines.push(e);
                    found = true;
                    break;
                }
            }
            if (!found)
                throw new Error(`Error: Missing engine "${p}"`);
        }

        return engines;
    }

    // returns a Tournament_Results object representing each of the players' scores against each
    // other in this tournament.
    getResults(){
        const results = new Tournament_Results(this.config.getPlayers());
        const pgn = this.files.games.readSync();
        const { ignored, gameCount } = results.readPGN(pgn);
        this.gameCount = gameCount;
        
        if (ignored > 0)
            logWarn(
                `Fetched results but ignored ${ignored} incorrectly formatted PGNs\nPlease check the file ${this.gamesFile}`
            );

        return results;
    }

    // fetches the positions file and returns all of the current suite of positions usable for
    // engine-playing.
    readPositions(){
        try {
            return this.files.positions.readJSON();
        }
        catch(err){
            // uh oh, maybe an error occurred just when the file was being written, clearing the
            // file instead! we have to regenerate it now...
            let positions = new Set(this.files.allPositions.readJSON());

            // remove already-used positions
            const gamesDB = this.files.games.readSync();
            for (const pgn of splitPGNs(gamesDB))
                positions.delete(extractHeaders(pgn).FEN || StartingFEN);

            // save positions
            positions = Array.from(positions);
            this.files.positions.saveJSON(positions);
            return positions;
        }
    }

    logToTerminal(){
        const { time, inc } = this.config.getTC();
        console.log(`\nTOURNAMENT: ${this.name}`);
        console.log(`MODE: ${this.config.getMode()}`);
        console.log(`TIME CONTROL: ${time}ms + ${inc}ms`);
        console.log("PLAYERS:");
    
        const players = this.config.getPlayers();
        const results = this.getResults();
        for (let i = 0; i < players.length; i++){
            const count = results.getResults(players[i]);
            const { totalScore, totalMaxScore } = results.getScore(players[i]);
            console.log(`${i + 1}. ${players[i]} (${totalScore}/${totalMaxScore}): ${count.wins} wins | ${count.draws} draws | ${count.losses} losses`);
        }
        console.log("In SPRT mode the new version is listed first and the old version second.");
        console.log("");
    }
}
