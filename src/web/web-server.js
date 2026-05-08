
import pathModule from "node:path";
import fs from "node:fs";
import http from "node:http";

import express from "express";
import { Server } from "socket.io";

import { Tournament } from "../tournament/tournament.js";


export function startWebServer(){
    // create a web server so people can join and watch the games!
    const app = express();
    const server = http.createServer(app);

    const io = new Server(server);

    app.use(express.static(pathModule.resolve("viewer")));
    app.use(express.json());
    
    // allow the client side to use some of the server modules.
    const boardModules = pathModule.resolve("node_modules", "hyper-chess-board");
    app.use("/board-modules", express.static(boardModules));

    app.get("/", (req, res) => {
        res.sendFile(pathModule.resolve("./viewer/pages/filter.html"));
    });

    app.get("/analyze", (req, res) => {
        res.sendFile(pathModule.resolve("./viewer/pages/game-analysis.html"));
    });

    app.get("/tournaments", (req, res) => {
        res.send(JSON.stringify(Tournament.getTournamentNames()));
    });

    // returns all of the live boards
    app.get("/live", (req, res) => {
        res.sendFile(pathModule.resolve("./viewer/pages/live.html"));
    });

    // returns all games of the tournament
    app.get("/:tournament/games", (req, res) => {
        const tourn = new Tournament(req.params.tournament);

        fs.readFile(tourn.compiledPath, (err, data) => {
            if (err){
                console.error(err);
                res.sendStatus(404);
                return;
            }
            res.send(data.toString());
        });
    });

    // returns the game along with engine debug info
    app.get("/:tournament/:id", async (req, res) => {
        const tourn = new Tournament(req.params.tournament);
        const [ gamePGN, whiteDebug, blackDebug ] = await tourn.getGame(req.params.id);
        res.send({ gamePGN, whiteDebug, blackDebug });
    });

    server.listen(8000);
    console.log("Listening to port 8000");
    
    return { server, io };
}
