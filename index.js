
import fs from "fs";
import pathModule from "path";

import { Piece } from "hyper-chess-board";

import { getEngines } from "./modules/tournament/engine-process.js";
import { input, inputNumber, options } from "./modules/utils/input.js";
import { Tournament } from "./modules/tournament/tournament.js";
import { Scheduler } from "./modules/tournament/scheduler.js";
import { startWebServer } from "./modules/web/web-server.js";
import { LiveManager } from "./modules/web/live.js";


const botsDir = pathModule.join(".", "bots");
const benchDir = pathModule.join(".", "bench");

const { io, server } = startWebServer();
const liveManager = new LiveManager(io);


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

            const tournaments = Tournament.getTournamentNames();
            tournaments.unshift("Create a new tournament");

            console.log("\nSelect a tournament to view (or create a new one):");
            const idx = await options(tournaments);

            if (idx == 0){
                const tourn = await createTournament();
                if (tourn)
                    await tournamentDashboard(tourn);
            }else{
                await tournamentDashboard(new Tournament(tournaments[idx]));
            }

        }else if (cmd[0] == "q"){
            break;
        }
    }

})();


async function tournamentDashboard(tourn){
    const scheduler = new Scheduler(tourn);
    liveManager.setScheduler(scheduler);

    while (true){
        if (!scheduler.isPlaying)
            tourn.logToTerminal();

        const cmd = (await input()).split(" ");

        // commands for playing or stopping the tournament
        if (cmd[0] == "play"){            
            if (scheduler.isPlaying){
                console.log("Tournament is already playing");
                continue;
            }

            console.log("\nHow many threads should the tournament handler use?");
            const t = await inputNumber(1, Infinity);

            scheduler.start(t);
        }else if (cmd[0] == "stop"){
            if (!scheduler.isPlaying){
                console.log("Tournament is not playing");
                continue;
            }

            console.log("\nPlease keep the program open to allow the final games to finish...");
            await scheduler.stop();
        }else if (cmd[0] == "quit"){
            console.log("\nLeft tournament dashboard");
            break;
        }

        // commands for modifying the tournament
        const players = tourn.getPlayerNames();
        if (cmd[0] == "add"){

            const engines = fs.readdirSync(botsDir).filter(v => v.endsWith(".exe"));

            for (let i = 0; i < engines.length; i++)
                engines[i] = engines[i].substring(0, engines[i].length - 4);

            if (engines.length == 0){
                console.log("No engines found.");
                continue;
            }

            engines.unshift("Exit");
            const idx = await options(engines);

            if (idx != 0){
                const name = engines[idx];
                tourn.addPlayer({ name, path: pathModule.join(".", "bots", `${name}.exe`) });
            }

        }else if (cmd[0] == "remove"){

            const engines = [ "Exit", ...players ];
            const idx = await options(engines);

            if (idx != 0)
                tourn.removePlayerByName(engines[idx]);

        }else if (cmd[0] == "timeControl"){

            const { time, inc } = tourn.timeControl;
            console.log(`\nThe time control currently is ${time}ms + ${inc}ms`);

            console.log("Type in the time (in ms) both players should start with:");
            const newTime = await inputNumber(0, Infinity);
            
            console.log("\nType in the increment (in ms) both players are given back per move");
            const newInc = await inputNumber(0, Infinity);

            if (newTime == 0 && newInc == 0)
                console.error("\nCannot set both time and increment to 0.");
            else
                tourn.setTimeControl(newTime, newInc);

        }else if (cmd[0] == "mode"){

            const modeConfig = tourn.sprt;

            console.log(`H0: ${modeConfig.h0}`);
            console.log(`H1: ${modeConfig.h1}`);
            console.log(`alpha: ${modeConfig.alpha}`);
            console.log(`beta: ${modeConfig.beta}`);

            console.log("\nSet the value of H0:");
            const h0 = await inputNumber(-Infinity, Infinity);

            console.log("\nSet the value of H1:");
            const h1 = await inputNumber(-Infinity, Infinity);

            console.log("\nSet the value of alpha:");
            const alpha = await inputNumber(0, 1);

            console.log("\nSet the value of beta:");
            const beta = await inputNumber(0, 1);

            tourn.setSPRT(h0, h1, alpha, beta);
        }
    }
}

async function createTournament(){
    let name;
    while (!name){
        console.log("Enter a name for your tournament:");
        name = await input();

        const tournaments = Tournament.getTournamentNames();
        if (tournaments.indexOf(name) > -1){
            console.log("A tournament of that name already exists, try a different name.");
            name = undefined;
        }
    }

    return new Tournament(name);
}

function displayBench(){
    console.log("\nBench:");
    for (const e of getEngines(benchDir))
        console.log(e.name);
    console.log("");
}

function displayBots(){
    console.log("\nBots:");
    for (const e of getEngines(botsDir))
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
        if (getEngineWithName(getEngines(botsDir), name) > -1)
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
        if (getEngineWithName(getEngines(benchDir), name) > -1)
            console.log(`${name} is already added`);
        else
            console.log(`Could not find ${name} in either the bench or bots`);
    }
}
