
import fs from "fs";
import pathModule from "path";

import { Board } from "../viewer/scripts/game/game.mjs";
import { Pipe_Manager } from "./pipes.mjs";


export class Game_Logger {
    constructor(tournName, pipes = []){
        this.gameId = 0;
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

        this.pipeData = JSON.parse(fs.readFileSync(this.dataFilePath).toString());
        this.pipeManager = new Pipe_Manager(pipes);
    }

    logGame(id, gameData){
        const fileName = `${id}_game.txt`;
        let log = `FEN: ${gameData.fen}\nWhite: ${gameData.white.name}\nBlack: ${gameData.black.name}\n`;

        const b = new Board();
        b.loadFEN(gameData.fen);

        this.pipeManager.start(b);
        this.pipeManager.all(b);

        for (const m of gameData.moves){
            log += `${m.uci}\n`;
            b.makeMove(m);
            this.pipeManager.all(b, m);
        }
        if (b.isGameOver())
            log += `${b.result.result} ${b.result.termination}`;

        fs.writeFileSync(pathModule.join(this.gamesPath, fileName), log);

        this.pipeData[`${id}_game`] = this.pipeManager.end(b);
        fs.writeFileSync(this.dataFilePath, JSON.stringify(this.pipeData));
    }

    logDouble(game1Data, game2Data){
        this.logGame(this.gameId++, game1Data);
        this.logGame(this.gameId++, game2Data);
    }
}


export function getGameLogPath(id, dirPath = gameLogsDir){
    return path.join(dirPath, `${id}_game.txt`);
}
