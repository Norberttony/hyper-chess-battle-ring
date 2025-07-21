
import { Piece } from "../game/piece.mjs";
import { getGamePhase, getConstellation } from "./filters.mjs";


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
        for (const p of this.pipes){
            p.end(board);
            data[p.name] = p.ctx;
        }
        return data;
    }
}


// counts the total number of moves that occurred in the game.
// ctx is just the game length
export class Game_Length_Pipe extends Pipe {
    constructor(){
        super("game-length");
    }

    start = () => this.ctx = 0;
    all   = () => this.ctx++;
    end   = () => this.ctx--;
}

export class Capture_Count_Pipe extends Pipe {
    constructor(){
        super("capture-count");
    }

    start = () => this.ctx = [ 0, 0, 0, 0, 0, 0 ];
    all(board){
        const moves = board.generateMoves(true);
        for (const m of moves)
            this.ctx[m.captures.length]++;
    }
}

// keeps track of the material constellations in stable positions.
// a material constellation is the current frequency of each piece (type and color).
export class Constellations_Pipe extends Pipe {
    constructor(){
        super("constellations");
        this.addAtStability = 6;
    }

    start(){
        // half-move counters indicating the start of phases.
        // keep in mind: if mass trades occur, a game CAN go immediately from the opening phase
        // to the endgame phase WITHOUT the middlegame.
        this.ctx = {
            constellations: [],
            atMove: []
        };

        this.halfmove = 0;
        this.stability = 0;
    }

    all(board, move){
        if (!move)
            return;
        this.halfmove++;
        if (move.captures.length > 0){
            this.stability = 0;
        }else if (++this.stability == this.addAtStability){
            const constellation = getConstellation(board);
            this.ctx.constellations.push(constellation);
            this.ctx.atMove.push(this.halfmove);

            const phase = getGamePhase(constellation);
            const phases = [ "opening", "middlegame", "lateMiddlegame", "endgame" ];
            if (!this.ctx[phases[phase]])
                this.ctx[phases[phase]] = this.halfmove - this.addAtStability;
        }
    }

    end(board){
        // always add a constellation of the final position
        const constellation = getConstellation(board);
        this.ctx.constellationEnd = constellation;
        this.ctx.lastPhase = getGamePhase(constellation);
    }
}

export class Heatmap_Pipe extends Pipe {
    constructor(){
        super("heatmap");
    }

    start(){
        this.ctx = {};
        this.ctx.heatmap = [];
        for (let s = 0; s < 64; s++)
            this.ctx.heatmap.push([ [ 0, 0, 0, 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0, 0, 0, 0 ] ]);
    }

    all(board, move){
        const phase = getGamePhase(getConstellation(board));
        if (phase < 2 && phase > 0){
            for (let s = 0; s < 64; s++){
                const v = board.squares[s];
                if (v > 0)
                    this.ctx.heatmap[s][Piece.ofColor(v, Piece.white) ? 0 : 1][Piece.getType(v)]++;
            }
        }
    }
}

export class Result_Pipe extends Pipe {
    constructor(){
        super("result");
    }

    end = (board) => this.ctx = board.result;
}
