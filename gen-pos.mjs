
import fs from "node:fs";
import path from "node:path";

import { Piece, Board, StartingFEN } from "hyper-chess-board";
import { extractHeaders, splitPGNs } from "hyper-chess-board/pgn";


{
    const fileNames = fs.readdirSync(".");
    for (const n of fileNames){
        if (path.extname(n) == ".pgn")
            scanFile(path.join(".", n));
    }
}


// returns true if the position is quiet (no capture moves) AND if the material is equal AND if the
// pseudolegal moves are exactly the same as the legal moves (no pins, checks, king attacks)
// Equal material occurs when both opponents have the same number of each piece type.
function isPositionQuietAndEqual(board){
    // 8 entries, first one is empty, the next index relevant piece type
    const pieceCounts = [ 0, 0, 0, 0, 0, 0, 0, 0 ];
    const hasPiece = [ false, false, false, false, false, false, false, false, false ];
    let zeroCounts = 8; // the number of zeroes
    for (let s = 0; s < 64; s++){
        const val = board.squares[s];

        // don't count empty squares
        if (val == 0)
            continue;

        // if this piece is immobilized, that's not a quiet position!
        if (board.isImmobilized(s, val))
            return false;

        const type = Piece.getType(val);
        const perspective = Piece.getColor(val) == Piece.white ? 1 : -1;

        hasPiece[type] = true;

        // will now be imbalanced
        if (pieceCounts[type] == 0)
            zeroCounts--;

        pieceCounts[type] += perspective;

        // rebalanced it!
        if (pieceCounts[type] == 0)
            zeroCounts++;
    }

    if (zeroCounts != 8)
        return false;

    // ensure there is at least 1 of each piece type
    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        if (!hasPiece[i])
            return false;
    }

    // now test for a quiet position
    for (const m of board.generateMoves(false)){
        // this indicates that there is some kind of pin or square-limiting attack on the king
        // or a check... best to avoid these types of positions.
        if (!board.isMoveLegal(m))
            return false;

        if (m.captures.length > 0)
            return false;
    }

    // time to test for the other side!!!
    board.nextTurn();
    // now test for a quiet position
    for (const m of board.generateMoves(false)){
        // this indicates that there is some kind of pin or square-limiting attack on the king
        // or a check... best to avoid these types of positions.
        if (!board.isMoveLegal(m)){
            board.nextTurn();
            return false;
        }

        if (m.captures.length > 0){
            board.nextTurn();
            return false;
        }
    }
    board.nextTurn();

    // position must be quiet!
    return true;
}


function scanFile(path){
    console.log(`Scanning file "${path}"`);
    const pgns = splitPGNs(fs.readFileSync(path).toString());
    const game = new Board();

    let FENs = [];

    for (let pgn of pgns){
        const headers = extractHeaders(pgn);
        const FEN = headers.FEN || StartingFEN;

        game.loadFEN(FEN);

        // remove headers
        pgn = pgn.replace(/\[.+?\]\s*/g, "");

        // remove any comments
        pgn = pgn.replace(/\{.+?\}\s*/g, "");

        // remove full move counters
        pgn = pgn.replace(/[0-9]+[\.]+/g, "");

        // remove variations
        pgn = pgn.replace(/\(.+?\)\s*/g, "");

        // make sure there is one space between each move
        pgn = pgn.replace(/\s+/g, " ");
        pgn = pgn.trim();

        // load the pgn
        const moves = pgn.split(" ");
        let lastAdded = -99999;
        for (let i = 0; i < moves.length; i++){
            const m1 = game.getMoveOfSAN(moves[i])
            if (m1){
                game.makeMove(m1);
            }

            // ensure the position is different enough from other similar positions
            // and also that this isn't too close to the opening phase of the game
            if (i >= 8 && i - lastAdded >= 4 && isPositionQuietAndEqual(game)){
                FENs.push(game.getFEN());
                lastAdded = i;
            }
        }
    }

    // determine FENs that were already in the set
    const positions = JSON.parse(fs.readFileSync("./data/positions.json").toString());
    const alreadyHasFENs = new Set(positions);

    // add non-duplicate FENs into position set
    let newPositions = 0;
    for (const fen of FENs){
        if (!alreadyHasFENs.has(fen)){
            alreadyHasFENs.add(fen);
            positions.push(fen);
            newPositions++;
        }
    }

    fs.writeFileSync("./data/positions.json", JSON.stringify(Array.from(alreadyHasFENs)));

    console.log(`Found ${newPositions} new positions, there are now ${alreadyHasFENs.size} in total`);
}
