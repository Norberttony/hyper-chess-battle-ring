import { convertToPGN } from "hyper-chess-board/dist/pgn";
import { Board, Move, StartingFEN, GameResult } from "hyper-chess-board";
import { Bot, ResultSymbol, TimeControl } from "./tournament";
import { PGNHeaders } from "hyper-chess-board/dist/graphics/pgn";
import { getResultSymbol } from "../stats/result";

// This class operates as a struct, and can freely be passed around as JSON strings or between
// workers/threads (since it has no methods that could get lost). Contains data regarding a
// complete game.
export class GameData {
    public moves: Move[];
    public loser: Bot | number = 0;

    constructor(
        public date: string,
        public round: string,
        public fen: string,
        moveObjects: Move[],
        public white: Bot,
        public black: Bot,
        public result: GameResult,
        public winner: Bot | number,
        public timeControl: TimeControl
    ){
        this.moves = moveObjects;

        if (this.winner == this.white)
            this.loser = this.black;
        else if (this.winner == this.black)
            this.loser = this.white;
    }
}


// takes in a given GameData object, and the id and event, and returns a string in PGN format.
export function convertGameDataToPGN(gameData: GameData, event?: string){
    const { time, inc } = gameData.timeControl;

    const { white, black, result, moves, date, round } = gameData;
    const symbol: ResultSymbol = getResultSymbol(result);

    const headers: any = {
        "Date": date,
        "Round": round,
        "Site": "Hyper Chess Battle Ring",
        "White": white.name,
        "Black": black.name,
        "Result": symbol,
        "Termination": result.termination,
        "TimeControl": `${time / 60000}+${inc / 1000}`
    };

    if (event)
        headers["Event"] = event;

    if (gameData.fen != StartingFEN){
        headers.FEN = gameData.fen;
        headers.Variant = "From Position";
    }

    const b = new Board();
    b.loadFEN(gameData.fen);

    return convertToPGN(headers, moves, b, symbol);
}
