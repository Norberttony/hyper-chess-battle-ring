
import { convertToPGN } from "hyper-chess-board/pgn";
import { Board, StartingFEN } from "hyper-chess-board";


// This class operates as a struct, and can freely be passed around as JSON strings or between
// workers/threads (since it has no methods that could get lost). Contains data regarding a
// complete game.
export class Game_Data {
    constructor(date, fen, moves, white, black, result, winner, whiteLog, blackLog, timeControl){
        this.date = date;
        this.fen = fen;
        this.moves = moves;
        this.white = white;
        this.black = black;
        this.result = result;
        this.winner = winner;
        this.loser = 0;
        this.whiteLog = whiteLog;
        this.blackLog = blackLog;
        this.timeControl = timeControl;

        if (this.winner == this.white)
            this.loser = this.black;
        else if (this.winner == this.black)
            this.loser = this.white;
    }
}


// takes in a given GameData object, and the id and event, and returns a string in PGN format.
export function convertGameDataToPGN(gameData, id, event){
    const { time, inc } = gameData.timeControl;

    const { white, black, result, moves, date } = gameData;

    const headers = {
        "Date": date,
        "Round": id,
        "Event": event,
        "Site": "Hyper Chess Battle Ring",
        "White": white.name,
        "Black": black.name,
        "Result": result.result,
        "Termination": result.termination,
        "TimeControl": `${time / 60000}+${inc / 1000}`
    };

    if (gameData.fen != StartingFEN){
        headers.FEN = gameData.fen;
        headers.Variant = "From Position";
    }

    const b = new Board();
    b.loadFEN(gameData.fen);

    return convertToPGN(headers, moves, b, result.result);
}
