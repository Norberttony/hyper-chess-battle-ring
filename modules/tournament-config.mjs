
import { logWarn } from "./logger.mjs";


const defaultConfig = {
    timeControl: { time: 12000, inc: 100 }, // in ms
    tournamentMode: "SPRT",
    players: [],

    // SPRT-specific config
    modeConfig: {
        h0: 0,
        h1: 10,
        alpha: 0.05,
        beta: 0.05
    }
};

const validTournamentModes = [ "SPRT" ];


export class Tournament_Config {
    #config;
    constructor(configFileObj){
        this.configFileObj = configFileObj;

        try {
            this.#config = configFileObj.readJSON();
        }
        catch(err){
            logWarn(`Could not read tournament config: ${err}. Loading default config instead`);
            this.#config = JSON.parse(JSON.stringify(defaultConfig));
        }

        const handler = {
            get: (target, prop) => {
                if (typeof target[prop] == "object" && target[prop] !== null)
                    return new Proxy(target[prop], handler);
                return target[prop];
            },
            set: (target, prop, val) => {
                // don't allow adding new properties
                if (target != this.#config.players){
                    if (!target[prop])
                        return logWarn(`${prop} is not a valid property`);
                    if (prop == "tournamentMode" && validTournamentModes.indexOf(val) == -1)
                        return logWarn(`${val} is not a valid tournament mode`);
                    if (typeof val != typeof target[prop])
                        return logWarn(`${val} is not of the same form as ${target[prop]} when setting ${prop}`);
                }
                target[prop] = val;
                this.save();
                return true;
            }
        }

        this.config = new Proxy(this.#config, handler);
        this.save();
    }

    getTC(){
        return this.config.timeControl;
    }

    setTC(time, inc){
        this.config.timeControl.time = time;
        this.config.timeControl.inc = inc;
    }

    getMode(){
        return this.config.tournamentMode;
    }

    getModeConfig(){
        return this.config.modeConfig;
    }

    save(){
        this.configFileObj.writeSync(JSON.stringify(this.#config));
    }

    getPlayers(){
        return this.config.players;
    }

    addPlayer(name){
        if (this.config.players.indexOf(name) == -1)
            this.config.players.push(name);
    }

    removePlayer(name){
        const idx = this.config.players.indexOf(name);
        if (idx > -1)
            this.config.players.splice(idx, 1);
    }
}
