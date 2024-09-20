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

const activeEngines = extractEngines("./bots/");
const benchedEngines = extractEngines("./bench/");

(async () => {
    
    loadTournamentInfo(activeEngines[0], activeEngines[1]);
    playTournament(activeEngines[0], activeEngines[1], 1);

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
