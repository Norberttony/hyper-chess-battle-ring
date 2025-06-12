
import { convertToPGN, getPGNDateNow } from "./pgn-file-reader.mjs";
import { Board, StartingFEN } from "../viewer/scripts/game/game.mjs";


export class Game_Data {
    constructor(fen, moves, white, black, result, winner, whiteLog, blackLog, timeControl){
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


export function convertGameDataToPGN(gameData, id, event){
    const { time, inc } = gameData.timeControl;

    const { white, black, result, moves } = gameData;

    const headers = {
        "Date": getPGNDateNow(),
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
