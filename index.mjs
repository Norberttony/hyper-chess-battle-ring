
import fs from "fs";
import pathModule from "path";

import { Tournament_Handler } from "./modules/tournament-handler.mjs";
import { extractEngines } from "./modules/engine.mjs";
import { input } from "./modules/input.mjs";
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

            await startTournament();

        }else if (cmd[0] == "play"){
            
            // assumes: first active engine plays as black.
            userVsEngine(io, extractEngines(botsDir)[0], Piece.black);

        }else if (cmd[0] == "q"){
            break;
        }
    }

})();

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

async function startTournament(){
    const activeEngines = extractEngines(botsDir);
    console.log(`Starting a tournament between ${activeEngines[0].name} and ${activeEngines[1].name}...`);

    console.log("\nWould you like to load previous tournament info? (y/n)");
    let usePrevious = false;
    const p = await input();
    if (p == "y"){
        usePrevious = true;
    }

    const tournament = new Tournament_Handler(activeEngines[0], activeEngines[1], usePrevious);

    console.log("\nNumber of threads?");
    let t = NaN;
    while (isNaN(t))
        t = parseInt(await input());
    tournament.start(t);

    // give user an option to stop the tournament
    // the tournament automatically stops when a hypothesis is proven with reasonable confidence,
    // but to return to the CLI, the user still has to type in "stop."
    const s = await input();
    if (s == "stop"){
        tournament.stop();
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

*/
