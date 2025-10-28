
import { Arbiter } from "./modules/tournament/arbiter.js";
import { getEngines } from "./modules/tournament/engine-process.js";

const engines = getEngines("./bots");
console.log(engines[0].name, "vs", engines[1].name);

(async () => {
    const a = new Arbiter("Test Run");
    const data = await a.playGame(engines[0], engines[1], "4k3/8/8/8/8/8/PPPPPPPP/4K3 w 0 1", "1", { time: 1000, inc: 100 }, "./game.pgn", "./wdbg.txt");
    console.log("Game finished");
    await a.terminate();
})();
