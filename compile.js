
const fs = require("fs");

const PGN_Handler = require("./modules/pgn-file-reader");

for (let i = 0; true; i++){
    const path = `./debug/${i}_game.txt`;
    if (fs.existsSync(path)){
        const pgn = PGN_Handler.convertLANToPGN(path) + "\n\n\n";
        fs.appendFileSync("./data/full_pgn.pgn", pgn);
    }else{
        break;
    }
}
