
import { Piece } from "../viewer/scripts/game/piece.mjs";
import { getMoveSAN } from "../viewer/scripts/game/san.mjs";


export function PGNHeadersToString(headers){
    let pgn = "";
    for (const [ name, value ] of Object.entries(headers))
        pgn += `[${name} "${value}"]\n`;
    return pgn;
}

// splits the given string into each individual game.
// returns an array of the individual games.
export function splitPGNs(pgnsString){
    const games = [];

    let globalIdx = 0;

    while (true){
        // to-do: does not handle cases where "1." might appear in the PGN headers...
        const movesIdx = pgnsString.indexOf("1.", globalIdx);
        const nextBrckt = pgnsString.indexOf("[", movesIdx);

        if (nextBrckt == -1){
            // end of file.
            games.push(pgnsString.substring(globalIdx).trim());
            return games;
        }else{
            games.push(pgnsString.substring(globalIdx, nextBrckt - 1).trim());
            globalIdx = nextBrckt - 1;
        }
    }
}

// takes in a list of moves
export function convertToPGN(headers, moves, board, result = "*"){
    let pgn = `${PGNHeadersToString(headers)}\n`;

    // play out each move
    let counter = board.fullmove;
    if (board.turn == Piece.black){
        pgn += `${counter++}... `;
    }
    for (const move of moves){
        const san = getMoveSAN(board, move);
        board.makeMove(move);

        if (board.turn == Piece.black){
            pgn += `${counter++}. ${san} `;
        }else{
            pgn += `${san} `;
        }
    }

    pgn += result;

    return pgn.trim();
}

// returns a dictionary where keys are header names and values are header values.
export function extractHeaders(pgn){
    const headers = {};

    let leftBracket = pgn.indexOf("[");
    while (leftBracket > -1){
        let rightBracket = pgn.indexOf("]");
        const field = pgn.substring(leftBracket, rightBracket + 1);

        let leftQuote = field.indexOf("\"") + leftBracket;
        let rightQuote = field.indexOf("\"", leftQuote + 1) + leftBracket;

        if (leftQuote > -1 && rightQuote > -1){
            let value = pgn.substring(leftQuote + 1, rightQuote).trim();
            let name = pgn.substring(leftBracket + 1, leftQuote).trim();
            headers[name] = value;
        }

        // remove header now that we've extracted it
        pgn = pgn.substring(rightBracket + 1);

        leftBracket = pgn.indexOf("[");
    }

    return headers;
}

export function extractMoves(pgn){
    // remove headers
    pgn = pgn.replace(/\[.+?\]\s*/g, "");

    // remove any comments
    pgn = pgn.replace(/\{.+?\}\s*/g, "");

    // remove full move counters
    pgn = pgn.replace(/[0-9]+[\.]+/g, "");

    // add a space before and after parentheses
    pgn = pgn.replace(/\(/g, " ( ").replace(/\)/g, " ) ");

    // make sure there is one space between each move
    pgn = pgn.replace(/\s+/g, " ");
    pgn = pgn.trim();

    return pgn;
}
