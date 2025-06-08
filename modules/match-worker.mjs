
import { Engine } from "./engine.mjs";
import { startADouble } from "./match-handler.mjs";

import { parentPort, workerData } from "worker_threads";


const e1 = new Engine(workerData.e1Name, workerData.e1Path);
const e2 = new Engine(workerData.e2Name, workerData.e2Path);


parentPort.on("message", async (pos) => {
    const data = await startADouble(e1, e2, pos.fen, { time: 1000, inc: 100 });
    parentPort.postMessage(JSON.stringify(data));
});
