

import fs from "fs";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import pathModule from "path";

import { Board } from "../viewer/scripts/game/game.mjs";
import { fileURLToPath } from "url";
import { getGameLogPath } from "./logger.mjs";


const __dirname = pathModule.dirname(fileURLToPath(import.meta.url));

export function startWebServer(){
    // create a web server so people can join and watch the games!
    const app = express();
    const server = http.createServer(app);

    const io = new Server(server);

    app.use(express.static(__dirname + "/../viewer"));

    app.use(express.json());

    app.get("/", (req, res) => {
        res.sendFile("index.html");
    });

    app.get("/game/:id", (req, res) => {
        const gamePath = pathModule.join(__dirname, "..", getGameLogPath(req.params.id));
        res.sendFile(gamePath);
    });

    app.get("/game/:tournament/:id", (req, res) => {
        const gamePath = pathModule.join(__dirname, "..", `data/tournaments/${req.params.tournament}/games/${req.params.id}_game.txt`);
        res.sendFile(gamePath);
    });

    app.get("/tournaments", (req, res) => {
        const dirPath = pathModule.join(__dirname, "..", "data/tournaments");
        fs.readdir(dirPath, (err, files) => {
            if (err)
                throw new Error(err);

            const tournamentNames = [];
            for (const file of files){
                // using a blocking I/O operation may not be a good idea
                // but performance isn't so necessary here :)
                if (fs.statSync(pathModule.join(dirPath, file)).isDirectory()){
                    tournamentNames.push(file);
                }
            }
            res.send(JSON.stringify(tournamentNames));
        });
    });

    server.listen(8000);
    console.log("Listening to port 8000");
    
    return { server, io };
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
