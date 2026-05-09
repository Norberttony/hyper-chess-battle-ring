import { GameResult, Side } from "hyper-chess-board";
import { ResultSymbol } from "../tournament/tournament.js";

export function getResultSymbol(result: GameResult): ResultSymbol {
    if (result.winner == Side.White)
        return "1-0";
    else if (result.winner == Side.Black)
        return "0-1";
    else if (result.winner == Side.None)
        return "1/2-1/2";
    else
        return "*";
}
