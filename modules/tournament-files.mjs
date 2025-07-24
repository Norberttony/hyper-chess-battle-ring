
import fs from "node:fs";
import pathModule from "node:path";
import { styleText } from "node:util";

import { extractHeaders, splitPGNs } from "../viewer/scripts/filter/pgn-file-reader.mjs";
import { Tournament_Results } from "./tournament-results.mjs";
import { extractEngines } from "./engine.mjs";


const tournamentPath = "./data/tournaments";
const botsPath = "./bots";
const defaultConfig = {
    timeControl: { time: 12000, inc: 100 }, // in ms
    tournamentMode: "SPRT",
    players: [],

    // SPRT-specific config
    modeConfig: {
        h0: 0,
        h1: 10,
        alpha: 0.05,
        beta: 0.05
    }
};

export const validTournamentModes = [ "SPRT" ];

export class Tournament_Files {
    constructor(name){
        this.name = name;
        this.rootPath = pathModule.join(tournamentPath, name);
        this.gamesPath = pathModule.join(this.rootPath, "games");
        this.debugPath = pathModule.join(this.rootPath, "debug");
        this.gamesFile = pathModule.join(this.gamesPath, "00_compiled_games.pgn");
        this.configFile = pathModule.join(this.rootPath, "config.json");
        this.positionsFile = pathModule.join(this.rootPath, "positions.json");

        if (!fs.existsSync(this.rootPath))
            fs.mkdirSync(this.rootPath);

        if (!fs.existsSync(this.gamesPath))
            fs.mkdirSync(this.gamesPath);

        if (!fs.existsSync(this.debugPath))
            fs.mkdirSync(this.debugPath);

        if (!fs.existsSync(this.gamesFile))
            fs.writeFileSync(this.gamesFile, "");

        if (!fs.existsSync(this.configFile))
            fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig));

        this.config = JSON.parse(fs.readFileSync(this.configFile).toString());

        const gameFiles = fs.readdirSync(this.gamesPath);
        this.gameId = 1;
        for (const name of fs.readdirSync(this.gamesPath)){
            const id = parseInt(name) + 1;
            if (id > this.gameId)
                this.gameId = id;
        }

        // -1 because of the compiled games file.
        this.gameCount = gameFiles.length - 1;

        if (!fs.existsSync(this.positionsFile) && this.gameCount == 0){
            const positions = fs.readFileSync("./data/positions.json").toString();
            fs.writeFileSync(this.positionsFile, positions);
        }
    }

    // returns the name of every tournament
    static getAllTournaments(){
        const tournaments = [];
        for (const name of fs.readdirSync(tournamentPath)){
            if (fs.statSync(pathModule.join(tournamentPath, name)).isDirectory())
                tournaments.push(name);
        }
        return tournaments;
    }

    // returns a promise fetches the game matching id and resolves with an object of the form
    // { gamePgn, whiteDebug, blackDebug } where gamePgn is the PGN as a string, and whiteDebug
    // and blackDebug correspond to the engine's logs during the game.
    async getGame(id){
        return new Promise((res, rej) => {
            let gamePgn;
            let whiteDebug;
            let blackDebug;

            function tryRes(){
                if (gamePgn && whiteDebug && blackDebug)
                    res({ gamePgn, whiteDebug, blackDebug });
            }

            fs.readFile(pathModule.join(this.gamesPath, `${id}_game.pgn`), (err, data) => {
                if (err)
                    return rej(err);
                gamePgn = data.toString();
                tryRes();
            });

            fs.readFile(pathModule.join(this.debugPath, `${id}_white.txt`), (err, data) => {
                if (err)
                    return rej(err);
                whiteDebug = data.toString();
                tryRes();
            });

            fs.readFile(pathModule.join(this.debugPath, `${id}_black.txt`), (err, data) => {
                if (err)
                    return rej(err);
                blackDebug = data.toString();
                tryRes();
            });
        });
    }

    // returns a promise that resolves with a string of a PGN database representing all the games
    // that were completed in this tournament.
    async getAllGames(){
        return new Promise((res, rej) => {
            fs.readFile(pathModule.join(this.gamesPath, "00_compiled_games.pgn"), (err, data) => {
                if (err)
                    return rej(err);
                res(data.toString());
            });
        });
    }

    // saves the given game into the tournament files
    saveGame(pgn, whiteDebug, blackDebug){
        const id = this.gameId++;
        fs.writeFileSync(pathModule.join(this.gamesPath, `${id}_game.pgn`), pgn);
        fs.appendFileSync(this.gamesFile, "\n" + pgn + "\n");
        this.gameCount++;

        fs.writeFileSync(pathModule.join(this.debugPath, `${id}_white.txt`), whiteDebug);
        fs.writeFileSync(pathModule.join(this.debugPath, `${id}_black.txt`), blackDebug);
    }

    // saves the tournament's current config into the files
    saveConfig(){
        fs.writeFileSync(this.configFile, JSON.stringify(this.config));
    }

    // returns the currently set time control
    getTimeControl(){
        return this.config.timeControl;
    }

    // sets the time control, where a player is initially given time ms and receives inc ms of
    // increment after every one of their moves.
    setTimeControl(time, inc){
        this.config.timeControl = { time, inc };
        this.saveConfig();
    }

    // returns the tournament's mode, currently can only be SPRT
    getTournamentMode(){
        return this.config.tournamentMode;
    }

    // sets the tournament's mode (SPRT)
    setTournamentMode(mode){
        if (validTournamentModes.indexOf(mode) == -1)
            throw new Error(`Unrecognized tournament mode ${mode}`);
        this.config.tournamentMode = mode;
        this.saveConfig();
    }

    getPlayers(){
        return this.config.players;
    }

    addPlayer(name){
        if (this.config.players.indexOf(name) == -1){
            this.config.players.push(name);
            this.saveConfig();
        }
    }

    removePlayer(name){
        const idx = this.config.players.indexOf(name);
        if (idx > -1){
            this.config.players.splice(idx, 1);
            this.saveConfig();
        }
    }

    getEngines(){
        const players = this.getPlayers();
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
        const results = new Tournament_Results(this.getPlayers());
        const pgn = fs.readFileSync(this.gamesFile).toString();
        const { ignored, gameCount } = results.readPGN(pgn);
        this.gameCount = gameCount;
        
        if (ignored > 0)
            console.warn(
                styleText(
                    "yellow",
                    `Fetched results but ignored ${ignored} incorrectly formatted PGNs\nPlease check the file ${this.gamesFile}`
                )
            );

        return results;
    }

    // fetches the positions file and returns all of the current suite of positions usable for
    // engine-playing.
    readPositions(){
        try {
            const positionsStr = fs.readFileSync(this.positionsFile).toString();
            return JSON.parse(positionsStr);
        }
        catch(err){
            // uh oh, maybe an error occurred just when the file was being written, clearing the
            // file instead! we have to regenerate it now...
            const positionsStr = fs.readFileSync(pathModule.join(".", "data", "positions.json")).toString();
            let positions = new Set(JSON.parse(positionsStr));

            // remove already-used positions
            const gamesDB = fs.readFileSync(this.gamesFile).toString();
            for (const pgn of splitPGNs(gamesDB))
                positions.delete(extractHeaders(pgn).FEN || StartingFEN);

            // save positions
            positions = Array.from(positions);
            this.savePositions(positions);
            return positions;
        }
    }

    savePositions(positions){
        fs.writeFileSync(this.positionsFile, JSON.stringify(positions));
    }

    getModeConfig(){
        return this.config.modeConfig;
    }

    logToTerminal(){
        const { time, inc } = this.getTimeControl();
        console.log(`\nTOURNAMENT: ${this.name}`);
        console.log(`MODE: ${this.getTournamentMode()}`);
        console.log(`TIME CONTROL: ${time}ms + ${inc}ms`);
        console.log("PLAYERS:");
    
        const players = this.getPlayers();
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
