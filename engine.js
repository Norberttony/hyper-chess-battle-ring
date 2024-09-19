
const fs = require("fs");
const { EngineProcess } = require("./engine-process");

class Engine {
    constructor(name, path){
        this.name = name;
        this.path = path;

        this.resultTable = {};
    }
    
    createProcess(onFinish, onError){
        return new EngineProcess(this, onFinish, onError);
    }

    addResult(opponent, result){
        let resultRow = this.resultTable[opponent.name];
        if (!resultRow){
            this.resultTable[opponent.name] = { wins: 0, draws: 0, losses: 0 };
            resultRow = this.resultTable[opponent.name];
        }

        switch(result){
            case -1:
                // lost
                resultRow.losses++;
                break;
            case 0:
                // drew
                resultRow.draws++;
                break;
            case 1:
                // won
                resultRow.wins++;
                break;
        }
    }
}

// extracts engines from a directory.
function extractEngines(dir){
    const engines = [];

    fs.readdirSync(dir).forEach(file => {
        if (file.endsWith(".exe")){
            // valid!
            const engine = new Engine(file.replace(".exe", ""), `${dir}${file}`);
            engines.push(engine);
        }
    });

    return engines;
}

module.exports = { Engine, extractEngines };
