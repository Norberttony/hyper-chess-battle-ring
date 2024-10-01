// create a web server so people can join and watch the games!
const express = require("express");
const http = require("http");

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server);

app.use(express.static(__dirname + "/viewer"));
app.use(express.static(__dirname + "/debug"));

app.use(express.json());

app.get("/", (req, res) => {
    res.sendFile("index.html");
});

const sockets = [];

const moves = [];

io.on("connection", (socket) => {

    sockets.push(socket);

    for (const m of moves){
        socket.emit("move", m);
    }

    //socket.on("makemove", socketMakeMove);

});

server.listen(8000);
console.log("Listening to port 8000");


const fs = require("fs");

const { setGlobalLogId, setLogDirs } = require("./modules/logger");
const { playTournament, loadTournamentInfo } = require("./modules/match-handler");
const { extractEngines } = require("./modules/engine");
const { input } = require("./modules/input");

const botsDir = "./bots/";
const benchDir = "./bench/";

const activeEngines = extractEngines(botsDir);
const benchedEngines = extractEngines(benchDir);

(async () => {
    
    while (true){
        console.log("Type in a command:");
        const cmd = (await input()).split(" ");
        
        if (cmd[0] == "bench"){

            displayBench();

        }else if (cmd[0] == "list"){

            displayBots();

        }else if (cmd[0] == "add"){
            
            addToBots(cmd[1]);

        }else if (cmd[0] == "remove"){

            addToBench(cmd[1]);
            
        }else if (cmd[0] == "tournament"){

            await startTournament();

        }else if (cmd[0] == "q"){
            break;
        }
    }

})();

function displayBench(){
    console.log("\nBench:");
    for (const e of benchedEngines)
        console.log(e.name);
    console.log("");
}

function displayBots(){
    console.log("\nBots:");
    for (const e of activeEngines)
        console.log(e.name);
    console.log("");
}

function getEngineWithName(arr, name){
    for (let i = 0; i < arr.length; i++){
        if (arr[i].name == name){
            return i;
        }
    }
    return -1;
}

function addToBots(name){
    const idx = getEngineWithName(benchedEngines, name);
    if (idx > -1){

        // set proper path
        const engine = benchedEngines[idx];
        const newPath = engine.path.replace(benchDir, botsDir);
        fs.renameSync(engine.path, newPath);
        engine.path = newPath;

        // move engine to active array
        benchedEngines.splice(idx, 1);
        activeEngines.push(engine);

        console.log("Successfully moved to bots!");

    }else{
        if (getEngineWithName(activeEngines, name) > -1)
            console.log(`${name} is already added`);
        else
            console.log(`Could not find ${name} in either the bench or bots`);
    }
}

function addToBench(name){
    const idx = getEngineWithName(activeEngines, name);
    if (idx > -1){

        // set proper path
        const engine = activeEngines[idx];
        const newPath = engine.path.replace(botsDir, benchDir);
        fs.renameSync(engine.path, newPath);
        engine.path = newPath;

        // move engine to active array
        activeEngines.splice(idx, 1);
        benchedEngines.push(engine);

        console.log("Successfully moved to bench!");

    }else{
        if (getEngineWithName(benchedEngines, name) > -1)
            console.log(`${name} is already benched`);
        else
            console.log(`Could not find ${name} in either the bench or bots`);
    }
}

async function startTournament(){
    console.log(`Starting a tournament between ${activeEngines[0].name} and ${activeEngines[1].name}...`);

    console.log("\nWould you like to load previous tournament info? (y/n)");
    const p = await input();
    if (p == "y"){
        loadTournamentInfo(activeEngines[0], activeEngines[1]);
    }

    console.log("\nNumber of threads?");
    const t = parseInt(await input());
    const tournament = await playTournament(activeEngines[0], activeEngines[1], t);

    // give user an option to stop the tournament
    // the tournament automatically stops when a hypothesis is proven with reasonable confidence,
    // but to return to the CLI, the user still has to type in "stop."
    const s = await input();
    if (s == "stop"){
        tournament.playing = false;
        console.log("Finishing up final doubles...");
    }
}

// user plays against engine
/*
console.log("Now playing against", engines[0]);
const engineProc = engines[0].createProcess(playerVsEngineHandler);

engineProc.start();
engineProc.write("");   // fen
engineProc.write("w");  // side to play

function socketMakeMove(move){
    console.log("Received move", move);
    engineProc.write(move);
    moves.push(move);
}

function playerVsEngineHandler(engine, data){
    console.log(data);

    const lines = data.split("\n");

    for (const l of lines){
        const cmds = l.trim().split(" ");

        switch(cmds[0]){
            case "makemove":
                moves.push(cmds[1]);
                for (const socket of sockets)
                    socket.emit("move", cmds[1]);
                console.log(cmds[1]);
                break;
        }
    }
}
*/
