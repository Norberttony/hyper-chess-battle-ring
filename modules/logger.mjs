
import fs from "fs";
import path from "path";

import { Board } from "../viewer/scripts/game/game.mjs";


export class Game_Logger {
    constructor(tournName){
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
    }

    logGame(id, gameData){
        let log = `FEN: ${gameData.fen}\nWhite: ${gameData.white.name}\nBlack: ${gameData.black.name}\n`;

        const b = new Board();
        b.loadFEN(gameData.fen);
        for (const m of gameData.moves){
            log += `${m.uci}\n`;
            b.makeMove(m);
        }

        fs.writeFileSync(path.join(this.gamesPath, `${id}_game.txt`));
    }

    logDouble(game1Data, game2Data){
        
    }
}


let globalLogId = 0;

let gameLogsDir = "./debug/";
let debugLogsDir = "./debug/";

export function setGlobalLogId(val){
    globalLogId = val;
}

export function setLogDirs(gamesNewDir, debugNewDir){
    gameLogsDir = gamesNewDir;
    debugLogsDir = debugNewDir;
}

export function getGameLogPath(id, dirPath = gameLogsDir){
    return path.join(dirPath, `${id}_game.txt`);
}

export function saveLogs(gameLog, proc1Name, proc1Log, proc2Name, proc2Log, isError = false){
    const gameId = globalLogId;
    
    if (!isError)
        globalLogId++;

    const idHeader = isError ? `${gameId}_error_` : gameId;

    fs.writeFileSync(path.join(gameLogsDir, `${idHeader}_game.txt`), gameLog, (err) => {
        if (err)
            console.error("Error: ", err);
    });

    // save debug files
    fs.writeFile(path.join(debugLogsDir, `${idHeader}_debug_${proc1Name}.txt`), proc1Log, (err) => {
        if (err)
            console.error("Error: ", err);
    });
    fs.writeFile(path.join(debugLogsDir, `${idHeader}_debug_${proc2Name}.txt`), proc2Log, (err) => {
        if (err)
            console.error("Error: ", err);
    });

    return isError ? -1 : gameId;
}
