
import { Piece } from "../game/piece.mjs";


// searches the game for constellations that match whitePieces and blackPieces.
// if an entry in whitePieces or blackPieces is undefined, that entry is checked for equality.
// returns true if the game matches the balance question, and false otherwise.
export function isBalance(game, whitePieces, blackPieces){
    if (!game.constellations || !game.constellations.constellations)
        return false;

    for (const constellation of game.constellations.constellations){
        for (let i = Piece.retractor; i < Piece.immobilizer; i++){
            if (!whitePieces[i] || !blackPieces[i]){
                if (constellation[0][i] != constellation[1][i])
                    return false;
            }else{
                if (whitePieces[i] != constellation[0][i] || blackPieces[i] != constellation[1][i])
                    return false;
            }
        }
    }
    
    return true;
}

export function countByResult(games){
    const resultsCount = [ 0, 0, 0 ];
    for (const g of games){
        if (g.result == "1-0")
            resultsCount[0]++;
        else if (g.result == "1/2-1/2")
            resultsCount[1]++;
        else if (g.result == "0-1")
            resultsCount[2]++;
    }
    return resultsCount;
}

// in this case path refers to the necessary attributes to access when reading the value to sum.
// path must specifically be an array of attributes
export function getSum(games, path){
    let sum = 0;
    for (let g of games){
        for (const p of path)
            g = g[p];
        sum += g;
    }
    return sum;
}
