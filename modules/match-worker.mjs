
import { Engine } from "./engine.mjs";
import { startAGame } from "./match-handler.mjs";

import { parentPort, workerData } from "worker_threads";


const e1 = new Engine(workerData.e1Name, workerData.e1Path);
const e2 = new Engine(workerData.e2Name, workerData.e2Path);


parentPort.on("message", async (game) => {
    // determine who plays white and who plays black
    const w = game.white.name == e1.name ? e1 : e2;
    const b = w == e1 ? e2 : e1;

    // play the game
    const data = await startAGame(w, b, game.fen, workerData.timeControl, matchListener);
    finishTask(data);
});


function matchListener(data){
    parentPort.postMessage(data);
}

function finishTask(data){
    parentPort.postMessage({ cmd: "finish", data });
}
