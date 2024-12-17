
const fs = require("fs");

let globalLogId = 0;

let gameLogsDir = "./debug/";
let debugLogsDir = "./debug/";

function setGlobalLogId(val){
    globalLogId = val;
}

function setLogDirs(gamesNewDir, debugNewDir){
    gameLogsDir = gamesNewDir;
    debugLogsDir = debugNewDir;
}

function saveLogs(gameLog, proc1Name, proc1Log, proc2Name, proc2Log, isError = false){
    const gameId = globalLogId;
    
    if (!isError)
        globalLogId++;

    const idHeader = isError ? `${gameId}_error_` : gameId;

    fs.writeFileSync(`${gameLogsDir}${idHeader}_game.txt`, gameLog, (err) => {
        if (err)
            console.error("Error: ", err);
    });

    // save debug files
    fs.writeFile(`${debugLogsDir}${idHeader}_debug_${proc1Name}.txt`, proc1Log, (err) => {
        if (err)
            console.error("Error: ", err);
    });
    fs.writeFile(`${debugLogsDir}${idHeader}_debug_${proc2Name}.txt`, proc2Log, (err) => {
        if (err)
            console.error("Error: ", err);
    });

    return isError ? -1 : gameId;
}

module.exports = { setGlobalLogId, setLogDirs, saveLogs };
