
import express from "express";
import http from "http";
import { Server } from "socket.io";
import pathModule from "path";

import { Board } from "../viewer/scripts/game/game.mjs";
import { fileURLToPath } from "url";
import { Tournament_Files } from "./tournament-files.mjs";


const __dirname = pathModule.dirname(fileURLToPath(import.meta.url));

export function startWebServer(){
    // create a web server so people can join and watch the games!
    const app = express();
    const server = http.createServer(app);

    const io = new Server(server);
    const sockets = [];
    let cmds = [];

    function setActiveTournament(t){
        // for now, just broadcast one game
        t.matchManager.workers[0].on("message", (event) => {
            io.emit("liveUpdate", event);
            cmds.push(event);

            if (event.cmd == "endgame")
                cmds = [];
        });
    }

    io.on("connection", (socket) => {
        sockets.push(socket);

        // get socket up to date with game
        for (const c of cmds)
            socket.emit("liveUpdate", c);

        socket.on("disconnect", () => sockets.splice(sockets.indexOf(socket), 1));
    });

    app.use(express.static(__dirname + "/../viewer"));

    app.use(express.json());

    app.get("*", (req, res) => {
        console.log(req.url);
        req.next();
    });

    app.get("/", (req, res) => {
        res.sendFile(pathModule.resolve("./viewer/pages/filter.html"));
    });

    app.get("/analyze", (req, res) => {
        res.sendFile(pathModule.resolve("./viewer/pages/game-analysis.html"));
    });

    app.get("/tournaments", (req, res) => {
        res.send(JSON.stringify(Tournament_Files.getTournamentNames()));
    });

    // returns all of the live boards
    app.get("/live", (req, res) => {
        res.sendFile(pathModule.resolve("./viewer/pages/live.html"));
    });

    // returns all games of the tournament
    app.get("/:tournament/games", (req, res) => {
        const files = new Tournament_Files(req.params.tournament);
        files.files.games.read()
            .then(data => res.send(data))
            .catch(err => res.sendStatus(404));
    });

    // returns the game along with engine debug info
    app.get("/:tournament/:id", (req, res) => {
        const files = new Tournament_Files(req.params.tournament);
        files.getGame(req.params.id)
            .then(data => res.send(data))
            .catch(err => res.sendStatus(404));
    });

    server.listen(8000);
    console.log("Listening to port 8000");
    
    return { server, io, setActiveTournament };
}

// user plays against engine given io, engine, and engine's side to play
export function userVsEngine(io, engine, stp){

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
