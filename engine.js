
const { EngineProcess } = require("./engine-process");

class Engine {
    constructor(name, path){
        this.name = name;
        this.path = path;
    }
    
    createProcess(handler){
        return new EngineProcess(this, handler);
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
            console.log(engine);
        }
    });

    return engines;
}

module.exports = { Engine, extractEngines };
