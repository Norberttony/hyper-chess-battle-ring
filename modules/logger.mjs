
import fs from "fs";
import path from "path";


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
