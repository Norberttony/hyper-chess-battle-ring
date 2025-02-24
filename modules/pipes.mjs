
export class Pipe {
    constructor(name){
        this.name = name;
        this.ctx = {};
    }

    start(board){}
    all(board, move){}
    end(board){}
}

export class Pipe_Manager {
    constructor(pipes){
        this.pipes = pipes;
    }

    start(board){
        for (const p of this.pipes)
            p.start(board);
    }

    all(board, move){
        for (const p of this.pipes)
            p.all(board, move);
    }

    end(board){
        const data = {};
        for (const p of this.pipes)
            data[p.name] = p.end(board);
        return data;
    }
}


// counts the total number of moves that occurred in the game.
export class Game_Length_Pipe extends Pipe {
    constructor(){
        super("game-length");
    }

    start = () => this.ctx.gameLength = 0;
    all   = () => this.ctx.gameLength++;
    end   = () => this.ctx.gameLength;
}

// keeps track of the material constellations in stable positions.
// a material constellation is the current frequency of each piece (type and color).
export class Constellations_Pipe extends Pipe {
    constructor(){
        super("constellations");
    }

    start(){
        this.ctx.stability = 0;
        this.ctx.constellations = [];
    }

    all(board, move){
        if (move.captures.length > 0){
            this.ctx.stability = 0;
        }else if (++this.ctx.stability == 8){
            // count frequency of each piece for each side independently.
            let pieceCounts = [ [ 0, 0, 0, 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0, 0, 0, 0 ] ];
            for (const p of board.squares){
                if (p){
                    const col = Piece.getColor(p) == Piece.white ? 0 : 1;
                    const typ = Piece.getType(p);
                    pieceCounts[col][typ]++;
                }
            }

            let constellation = "";
            for (let i = Piece.retractor; i <= Piece.immobilizer; i++){
                constellation += pieceCounts[0][i];
                constellation += pieceCounts[1][i];
            }
            this.ctx.constellations.push(constellation);
        }
    }

    end(){
        return this.ctx.constellations;
    }
}
