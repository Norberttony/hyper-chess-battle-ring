
import fs from "fs";
import pathModule from "path";

import { Tournament_Handler } from "./modules/tournament-handler.mjs";
import { Tournament_Files } from "./modules/tournament-files.mjs";
import { extractEngines } from "./modules/engine.mjs";
import { input, options } from "./modules/input.mjs";
import { startWebServer, userVsEngine } from "./modules/web-server.mjs";
import { Piece } from "./viewer/scripts/game/piece.mjs";


const botsDir = "./bots/";
const benchDir = "./bench/";


(async () => {

    const { io, server } = startWebServer();

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

            const tournaments = Tournament_Files.getAllTournaments();
            tournaments.unshift("Create a new tournament");

            console.log("\nSelect a tournament to view (or create a new one):");
            const idx = await options(tournaments);

            if (idx == 0){
                const files = await createTournament();
                if (files)
                    await tournamentDashboard(files);
            }else{
                await tournamentDashboard(new Tournament_Files(tournaments[idx]));
            }

        }else if (cmd[0] == "play"){
            
            // assumes: first active engine plays as black.
            userVsEngine(io, extractEngines(botsDir)[0], Piece.black);

        }else if (cmd[0] == "q"){
            break;
        }
    }

})();


function logTournament(files){
    const { time, inc } = files.getTimeControl();
    console.log(`\nTOURNAMENT: ${files.name}`);
    console.log(`MODE: ${files.getTournamentMode()}`);
    console.log(`TIME CONTROL: ${time}ms + ${inc}ms`);
    console.log("PLAYERS:");

    let i = 0;
    for (const name of files.getPlayers())
        console.log(`${++i}. ${name}`);
    console.log("In SPRT mode the new version is listed first and the old version second.");
    console.log("");
}

async function tournamentDashboard(files){
    const handler = new Tournament_Handler(files);

    while (true){
        if (!handler.playing)
            logTournament(files);

        const cmd = (await input()).split(" ");

        // commands for playing or stopping the tournament
        if (cmd[0] == "play"){            
            if (handler.playing){
                console.log("Tournament is already playing");
                continue;
            }
            
            console.log("\nHow many threads should the tournament handler use?");
            let t = NaN;
            while (isNaN(t) || t <= 0)
                t = parseInt(await input());

            handler.start(t);
        }else if (cmd[0] == "stop"){
            if (!handler.playing){
                console.log("Tournament is not playing");
                continue;
            }

            console.log("\nPlease keep the program open to allow the final games to finish...");
            await handler.stop();
        }

        // commands for modifying the tournament
        const players = files.getPlayers();
        if (cmd[0] == "add"){
            const engines = extractEngines(botsDir);
            const engineNames = [];
            for (const { name } of engines){
                if (players.indexOf(name) == -1)
                    engineNames.push(name);
            }

            engineNames.unshift("Exit");

            const idx = await options(engineNames);

            if (idx != 0)
                files.addPlayer(engineNames[idx]);
        }else if (cmd[0] == "remove"){
            const engineNames = [ "Exit", ...players ];
            const idx = await options(engineNames);
            if (idx != 0)
                files.removePlayer(engineNames[idx]);
        }
    }
}

async function createTournament(){
    const tournaments = Tournament_Files.getAllTournaments();

    let name;
    while (!name){
        console.log("Enter a name for your tournament:");
        name = await input();

        if (tournaments.indexOf(name) > -1){
            console.log("A tournament of that name already exists, try a different name.");
            name = undefined;
        }
    }

    return new Tournament_Files(name);
}

function displayBench(){
    console.log("\nBench:");
    for (const e of extractEngines(benchDir))
        console.log(e.name);
    console.log("");
}

function displayBots(){
    console.log("\nBots:");
    for (const e of extractEngines(botsDir))
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
    const oldPath = pathModule.join(benchDir, name + ".exe");
    if (fs.existsSync(oldPath)){
        fs.renameSync(oldPath, pathModule.join(botsDir, name + ".exe"));
        console.log("Successfully moved to bots!");
    }else{
        if (getEngineWithName(extractEngines(botsDir), name) > -1)
            console.log(`${name} is already added`);
        else
            console.log(`Could not find ${name} in either the bench or bots`);
    }
}

function addToBench(name){
    const oldPath = pathModule.join(botsDir, name + ".exe");
    if (fs.existsSync(oldPath)){
        fs.renameSync(oldPath, pathModule.join(benchDir, name + ".exe"));
        console.log("Successfully moved to bots!");
    }else{
        if (getEngineWithName(extractEngines(benchDir), name) > -1)
            console.log(`${name} is already added`);
        else
            console.log(`Could not find ${name} in either the bench or bots`);
    }
}
