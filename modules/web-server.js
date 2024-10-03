
const { Board } = require("../viewer/scripts/game/game");
const { Piece } = require("../viewer/scripts/game/piece");

function startWebServer(){
    // create a web server so people can join and watch the games!
    const express = require("express");
    const http = require("http");

    const app = express();
    const server = http.createServer(app);

    const io = require("socket.io")(server);

    app.use(express.static(__dirname + "/../viewer"));
    app.use(express.static(__dirname + "/../debug"));

    app.use(express.json());

    app.get("/", (req, res) => {
        res.sendFile("index.html");
    });

    server.listen(8000);
    console.log("Listening to port 8000");
    
    return { server, io };
}

// user plays against engine given io, engine, and engine's side to play
function userVsEngine(io, engine, stp){

    console.log("Setting up IO...");

    io.on("connection", (socket) => {

        console.log("New socket connected. Setting up engine...");
        
        const board = new Board();
        const moves = [];

        // prepare process for engine and for user
        const eproc = engine.createProcess(() => 0, () => 0);
        const dummyProc = {
            engine: { name: "user" },

            opponentMove: (lan) => {
                moves.push(lan);
                socket.emit("move", lan);
            }
        };

        // set up engine process
        eproc.setOpponent(dummyProc);
        eproc.setup(board, stp);


        // === socket io events === //

        socket.on("makemove", (lan) => {
            moves.push(lan);
            board.playLANMove(lan);
            eproc.opponentMove(lan);
        });

        socket.on("disconnect", () => {
            console.log("Disconnecting...");
            eproc.saveGameLog("./data/");
            eproc.saveProcLog("./data/");
            eproc.stop();
        });

        console.log("Set up complete!");

    });

    console.log("IO set up! Be sure to refresh any connections");
}

module.exports = { startWebServer, userVsEngine };
