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


const { setGlobalLogId, setLogDirs } = require("./modules/logger");
const { playTournament, loadTournamentInfo } = require("./modules/match-handler");
const { extractEngines } = require("./modules/engine");
const { input } = require("./modules/input");

const activeEngines = extractEngines("./bots/");
const benchedEngines = extractEngines("./bench/");

(async () => {
    
    while (true){
        console.log("Type in a command:");
        const cmd = (await input()).split(" ");
        
        if (cmd[0] == "bench"){
            console.log("\nBench:");
            for (const e of benchedEngines)
                console.log(e.name);
            console.log("");
        }else if (cmd[0] == "list"){
            console.log("\nBots:");
            for (const e of activeEngines)
                console.log(e.name);
            console.log("");
        }else if (cmd[0] == "add"){

        }else if (cmd[0] == "remove"){
            
        }else if (cmd[0] == "tournament"){
            console.log("\nWould you like to load previous tournament info? (y/n)");
            const p = await input();
            if (p == "y"){
                loadTournamentInfo(activeEngines[0], activeEngines[1]);
            }

            console.log("\nNumber of threads?");
            const t = parseInt(await input());
            playTournament(activeEngines[0], activeEngines[1], t);
        }else if (cmd[0] == "q"){
            break;
        }
    }

})();

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
