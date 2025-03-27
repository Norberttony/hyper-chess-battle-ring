
import fs from "fs";

import * as PGN_Handler from "./modules/pgn-file-reader.mjs";

console.log(PGN_Handler.convertLANToPGN("./data/tournaments/v16z1__vs__v17z18/games/937_game.txt"));

/*
for (let i = 0; true; i++){
    const path = `./debug/${i}_game.txt`;
    if (fs.existsSync(path)){
        const pgn = PGN_Handler.convertLANToPGN(path) + "\n\n\n";
        fs.appendFileSync("./data/full_pgn.pgn", pgn);
    }else{
        break;
    }
}
*/