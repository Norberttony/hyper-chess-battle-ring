
import fs from "fs";
import pathModule from "path";

import { Tournament_Handler } from "./modules/tournament-handler.mjs";
import { Tournament_Files } from "./modules/tournament-files.mjs";
import { extractEngines } from "./modules/engine.mjs";
import { input, inputNumber, options } from "./modules/input.mjs";
import { startWebServer, userVsEngine } from "./modules/web-server.mjs";
import { Piece } from "./viewer/scripts/game/piece.mjs";


const botsDir = "./bots/";
const benchDir = "./bench/";

const globals = {};


(async () => {

    const { io, server, setActiveTournament } = startWebServer();

    globals.setActiveTournament = setActiveTournament;

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
            setActiveTournament(undefined);

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

    const players = files.getPlayers();
    const results = files.getResults();
    for (let i = 0; i < players.length; i++){
        const count = results.getResults(players[i]);
        const { totalScore, totalMaxScore } = results.getScore(players[i]);
        console.log(`${i + 1}. ${players[i]} (${totalScore}/${totalMaxScore}): ${count.wins} wins | ${count.draws} draws | ${count.losses} losses`);
    }
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
            const t = await inputNumber(1, Infinity);

            handler.start(t);
            globals.setActiveTournament(handler);
        }else if (cmd[0] == "stop"){
            if (!handler.playing){
                console.log("Tournament is not playing");
                continue;
            }

            console.log("\nPlease keep the program open to allow the final games to finish...");
            await handler.stop();
        }else if (cmd[0] == "quit"){
            console.log("\nLeft tournament dashboard");
            break;
        }

        // commands for modifying the tournament
        const players = files.getPlayers();
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

            if (idx != 0)
                files.addPlayer(engines[idx]);

        }else if (cmd[0] == "remove"){

            const engines = [ "Exit", ...players ];
            const idx = await options(engines);

            if (idx != 0)
                files.removePlayer(engines[idx]);

        }else if (cmd[0] == "timeControl"){

            const { time, inc } = files.getTimeControl();
            console.log(`\nThe time control currently is ${time}ms + ${inc}ms`);

            console.log("Type in the time (in ms) both players should start with:");
            const newTime = await inputNumber(0, Infinity);
            
            console.log("\nType in the increment (in ms) both players are given back per move");
            const newInc = await inputNumber(0, Infinity);

            if (newTime == 0 && newInc == 0)
                console.error("\nCannot set both time and increment to 0.");
            else
                files.setTimeControl(newTime, newInc);

        }else if (cmd[0] == "mode"){

            const mode = files.getTournamentMode();
            console.log(`\nCurrent mode is ${mode}`);

            const modeConfig = files.getModeConfig();
            if (mode == "SPRT"){
                console.log(`H0: ${modeConfig.h0}`);
                console.log(`H1: ${modeConfig.h1}`);
                console.log(`alpha: ${modeConfig.alpha}`);
                console.log(`beta: ${modeConfig.beta}`);

                console.log("\nSet the value of H0:");
                modeConfig.h0 = await inputNumber(-Infinity, Infinity);

                console.log("\nSet the value of H1:");
                modeConfig.h1 = await inputNumber(-Infinity, Infinity);

                console.log("\nSet the value of alpha:");
                modeConfig.alpha = await inputNumber(0, 1);

                console.log("\nSet the value of beta:");
                modeConfig.beta = await inputNumber(0, 1);

                files.saveConfig();
            }
        }
    }
}

async function createTournament(){
    let name;
    while (!name){
        console.log("Enter a name for your tournament:");
        name = await input();

        const tournaments = Tournament_Files.getAllTournaments();
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
