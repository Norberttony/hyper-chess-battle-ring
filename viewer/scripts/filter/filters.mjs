
import { Piece } from "../game/piece.mjs";


// searches the game for constellations that match whitePieces and blackPieces.
// if an entry in whitePieces or blackPieces is undefined, that entry is checked for equality.
// returns true if the game matches the balance question, and false otherwise.
export function isBalance(game, whitePieces, blackPieces){
    if (!game.constellations || !game.constellations.constellations)
        return false;

    for (const constellation of game.constellations.constellations){
        let isValid = true;
        for (let i = Piece.king; i <= Piece.immobilizer; i++){
            if (!whitePieces[i] || !blackPieces[i]){
                if (constellation[0][i] != constellation[1][i]){
                    isValid = false;
                    break;
                }
            }else{
                if (whitePieces[i] != constellation[0][i] || blackPieces[i] != constellation[1][i]){
                    isValid = false;
                    break;
                }
            }
        }
        if (isValid)
            return true;
    }
    
    return false;
}

// expects s1 and s2 to each be only one side of the constellation
export function areConstellationSidesEqual(s1, s2){
    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        if (s1[i] == undefined || s2[i] == undefined || s1[i] == "=" || s2[i] == "=")
            continue;
        if (s1[i] != s2[i])
            return false;
    }
    return true;
}

export function findConstellation(game, constellation){
    if (!game.constellations || !game.constellations.constellations)
        return -1;

    const c2 = constellation;
    let idx = 0;
    for (const c of game.constellations.constellations){
        let isValid = true;

        for (let i = Piece.king; i <= Piece.immobilizer; i++){
            // check if both sides have an equal number of pieces
            if (c2[0][i] == "=" || c2[1][i] == "="){
                if (c[0][i] != c[1][i]){
                    isValid = false;
                    break;
                }else{
                    continue;
                }
            }
            // check piece equality to constellation
            if (c2[0][i] !== undefined && c2[0][i] != c[0][i] || c2[1][i] !== undefined && c2[1][i] != c[1][i]){
                isValid = false;
                break;
            }
        }

        // repeat this but consider the sides reversed...
        // this ensures that the color does not matter when looking for constellations
        if (!isValid){
            isValid = true;

            for (let i = Piece.king; i <= Piece.immobilizer; i++){
                // check if both sides have an equal number of pieces
                if (c2[0][i] == "=" || c2[1][i] == "="){
                    if (c[0][i] != c[1][i]){
                        isValid = false;
                        break;
                    }else{
                        continue;
                    }
                }
                if (c2[1][i] !== undefined && c2[1][i] != c[0][i] || c2[0][i] !== undefined && c2[0][i] != c[1][i]){
                    isValid = false;
                    break;
                }
            }
        }

        if (isValid)
            return { ply: game.constellations.atMove[idx], constellation: c };

        idx++;
    }

    return -1;
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

// returns the phase at the end of the game
// 0 for opening, 1 for middlegame, 2 for late middlegame, 3 for endgame
export function getGamePhase(constellation){
    // max value is 65
    const pieceWeights = {
        [Piece.straddler]: 0.75,
        [Piece.king]: 0,
        [Piece.retractor]: 1.5,
        [Piece.springer]: 3,
        [Piece.chameleon]: 4,
        [Piece.coordinator]: 5,
        [Piece.immobilizer]: 6
    };

    let value = 0;
    for (let i = Piece.king; i <= Piece.immobilizer; i++)
        value += pieceWeights[i] * (constellation[0][i] + constellation[1][i]);

    if (value >= 53){
        return 0;
    }else if (value >= 40){
        return 1;
    }else if (value >= 16){
        return 2;
    }else{
        return 3;
    }
}
