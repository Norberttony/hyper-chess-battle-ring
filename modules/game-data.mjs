
export class Game_Data {
    constructor(fen, moves, white, black, result, winner, whiteLog, blackLog){
        this.fen = fen;
        this.moves = moves;
        this.white = white;
        this.black = black;
        this.result = result;
        this.winner = winner;
        this.loser = 0;
        this.whiteLog = whiteLog;
        this.blackLog = blackLog;

        if (this.winner == this.white)
            this.loser = this.black;
        else if (this.winner == this.black)
            this.loser = this.white;
    }
}
