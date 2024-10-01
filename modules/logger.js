
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

function saveLogs(proc1, proc2){
    const gameId = globalLogId++;

    if (proc1.gameLog == proc2.gameLog){
        // save as just one game file
        fs.writeFile(`${gameLogsDir}${gameId}_game.txt`, proc1.gameLog, (err) => {
            if (err)
                console.error("Error: ", err);
        });
    }else{
        // save both separately
        fs.writeFile(`${gameLogsDir}${gameId}_game_${proc1.engine.name}.txt`, proc1.gameLog, (err) => {
            if (err)
                console.error("Error: ", err);
        });
        fs.writeFile(`${gameLogsDir}${gameId}_game_${proc2.engine.name}.txt`, proc2.gameLog, (err) => {
            if (err)
                console.error("Error: ", err);
        });
    }

    // save debug files
    fs.writeFile(`${debugLogsDir}${gameId}_debug_${proc1.engine.name}.txt`, proc1.procLog, (err) => {
        if (err)
            console.error("Error: ", err);
    });
    fs.writeFile(`${debugLogsDir}${gameId}_debug_${proc2.engine.name}.txt`, proc2.procLog, (err) => {
        if (err)
            console.error("Error: ", err);
    });
}

module.exports = { setGlobalLogId, setLogDirs, saveLogs };
