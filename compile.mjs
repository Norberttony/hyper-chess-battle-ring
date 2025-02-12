
import fs from "fs";

import * as PGN_Handler from "./modules/pgn-file-reader.mjs";


for (let i = 0; true; i++){
    const path = `./debug/${i}_game.txt`;
    if (fs.existsSync(path)){
        const pgn = PGN_Handler.convertLANToPGN(path) + "\n\n\n";
        fs.appendFileSync("./data/full_pgn.pgn", pgn);
    }else{
        break;
    }
}
