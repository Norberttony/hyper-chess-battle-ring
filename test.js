
import { Tournament } from "./modules/tournament/tournament.js";
import { Scheduler } from "./modules/tournament/scheduler.js";
import { getEngines } from "./modules/tournament/engine-process.js";

const engines = getEngines("./bots");
console.log(engines[0].name, "vs", engines[1].name);
console.log(engines);

(async () => {
    const t = new Tournament("1TEST");
    const s = new Scheduler(t);

    s.start(1);
})();
