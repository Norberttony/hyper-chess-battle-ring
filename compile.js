
// A script that helps in generating random bench suites for the engine.

import fs from "node:fs";
import { splitPGNs, extractHeaders, extractMoves } from "hyper-chess-board/pgn";
import { Board } from "hyper-chess-board";

{
    const gamesPath = "./data/tournaments/2.3.0-2 magic-cache/games";
    const compiledGamesPath = `${gamesPath}/00_compiled_games.pgn`;
    const pgnDB = fs.readFileSync(compiledGamesPath).toString();

    let cmds = [];

    for (const pgn of splitPGNs(pgnDB)){
        const headers = extractHeaders(pgn);
        if (!headers.FEN)
            headers.FEN = StartingFEN;
        const segments = headers.FEN.split(" ");
        segments.splice(2, -1, "0");
        headers.FEN = segments.join(" ");

        const b = new Board();
        b.loadFEN(headers.FEN);

        let mIdx = 0;
        let skip = 0;
        for (const san of extractMoves(pgn).split(" ")){
            const m = b.getMoveOfSAN(san);
            if (m){
                b.makeMove(m);
                mIdx++;
                skip++;
                if (mIdx >= 20 && skip >= 6 && Math.random() > 0.75){
                    skip = 0;
                    cmds.push(`clear hash\nposition fen ${b.getFEN()}\ngo depth 5`);
                }
            }
        }
    }

    while (cmds.length > 1000)
        cmds.splice(Math.floor(Math.random() * cmds.length), 1);

    fs.writeFileSync("./data/cmds.txt", cmds.join("\n") + "\nquit\n");

    process.exit();
}
