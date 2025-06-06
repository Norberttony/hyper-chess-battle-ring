
import fs from "fs";
import pathModule from "path";

import { Board, StartingFEN } from "../viewer/scripts/game/game.mjs";
import { convertToPGN } from "./pgn-file-reader.mjs";


export class Game_Logger {
    constructor(tournName){
        this.gameId = 1;
        this.path = pathModule.join("./data/tournaments", tournName);
        if (!fs.existsSync(this.path)){
            throw new Error(`Cannot log games for tournament ${tournName} as its folder does not exist.`);
        }
        
        this.gamesPath = pathModule.join(this.path, "games");
        if (!fs.existsSync(this.gamesPath))
            fs.mkdirSync(this.gamesPath);

        this.debugPath = pathModule.join(this.path, "debug");
        if (!fs.existsSync(this.debugPath))
            fs.mkdirSync(this.debugPath);

        this.dataFilePath = pathModule.join(this.path, "data.json");
        if (!fs.existsSync(this.dataFilePath))
            fs.writeFileSync(this.dataFilePath, "{}");
    }

    logGame(id, gameData){
        const fileName = `${id}_game.pgn`;

        const { time, inc } = gameData.timeControl;

        const headers = {
            "Date": getPGNDateNow(),
            "Round": id,
            "Event": "Battle Ring Tournament",
            "Site": "Hyper Chess Battle Ring",
            "White": gameData.white.name,
            "Black": gameData.black.name,
            "Result": gameData.result.result,
            "Termination": gameData.result.termination,
            "TimeControl": `${time / 60000}+${inc / 1000}`
        };

        if (gameData.fen != StartingFEN){
            headers.FEN = gameData.fen;
            headers.Variant = "From Position";
        }

        const b = new Board();
        b.loadFEN(gameData.fen);

        const pgn = convertToPGN(headers, gameData.moves, b, gameData.result.result);

        fs.writeFileSync(pathModule.join(this.gamesPath, fileName), pgn);
        fs.writeFileSync(pathModule.join(this.debugPath, `${id}_game_white.txt`), gameData.whiteLog);
        fs.writeFileSync(pathModule.join(this.debugPath, `${id}_game_black.txt`), gameData.blackLog);
    }

    logDouble(game1Data, game2Data){
        this.logGame(this.gameId++, game1Data);
        this.logGame(this.gameId++, game2Data);
    }
}


export function getGameLogPath(id, dirPath = gameLogsDir){
    return path.join(dirPath, `${id}_game.pgn`);
}

// returns the current date in the form YYYY.MM.DD
function getPGNDateNow(){
    const date = new Date();
    const y = date.getFullYear().toString().padStart(4, "0");
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = (date.getDay() + 1).toString().padStart(2, "0");

    return `${y}.${m}.${d}`;
}
