
const spawn = require("child_process").spawn;
const { Piece } = require("./viewer/scripts/game/piece");

class EngineProcess {
    constructor(engine, onFinish, onError){
        this.engine = engine;
        this.onFinish = onFinish;
        this.onError = onError;

        this.board;
        this.side;
        this.opponent;
        this.proc;
    }

    // sets up the board and side the engine will play
    setup(board, side){
        if (this.proc)
            this.stop();

        this.proc = spawn(this.engine.path);

        this.board = board;
        this.side = side;

        const t = this;

        this.proc.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");

            for (const l of lines){
                if (l.startsWith("makemove")){
                    // get move from command
                    const lan = l.trim().split(" ")[1];
                    const move = board.getLANMove(lan);

                    console.log(lan);

                    // engine is making a move on the board
                    if (move){
                        t.board.makeMove(move);

                        // if the game ends with this move, report it
                        if (t.board.isGameOver()){
                            t.onFinish(this);
                            return;
                        }

                        if (t.opponent){
                            t.opponent.opponentMove(lan);
                        }else{
                            t.onError(this, "Opponent not set");
                        }
                    }else{
                        t.onError(this, `Could not recognize move of LAN ${lan}`);
                    }
                }
            }
        });

        this.proc.stdout.on("error", (err) => {
            t.onError(this, err);
        });


        // write set up for FEN
        this.write(board.getFEN());

        // write which side the opponent is playing
        this.write(this.side == Piece.white ? "b" : "w");
    }

    setOpponent(engineProcess){
        this.opponent = engineProcess;
    }

    // opponent has played a move
    opponentMove(lan){
        this.write(lan);
    }

    stop(){
        this.proc.kill();
        delete this.proc;
    }
    
    write(cmd){
        if (this.proc){
            this.proc.stdin.write(`${cmd}\n`);
        }
    }
}

module.exports = { EngineProcess };
