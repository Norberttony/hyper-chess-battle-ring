
const spawn = require("child_process").spawn;
const { Piece } = require("../viewer/scripts/game/piece");

class EngineProcess {
    constructor(engine, onFinish, onError){
        this.engine = engine;
        this.onFinish = onFinish;
        this.onError = onError;

        this.board;
        this.side;
        this.opponent;
        this.proc;

        this.procLog = "";
        this.gameLog = "";
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
                this.procLog += `${l}\n`;
                if (l.startsWith("makemove")){
                    // get move from command
                    const lan = l.trim().split(" ")[1];
                    const move = board.getLANMove(lan);

                    this.gameLog += `${lan}\n`;

                    // engine is making a move on the board
                    if (move){
                        t.board.makeMove(move);

                        // if the game ends with this move, report it
                        if (t.board.isGameOver()){
                            // of course, we have to update the opponent's game log with the move
                            // but without continuing this game
                            t.opponent.gameLog += `${lan}\n`;

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


        const fen = board.getFEN();

        // write game log info
        this.gameLog += `FEN: ${fen}\n`;
        this.gameLog += `White: ${this.side == Piece.white ? this.engine.name : this.opponent.engine.name}\n`;
        this.gameLog += `Black: ${this.side == Piece.black ? this.engine.name : this.opponent.engine.name}\n`;

        // write set up for FEN
        this.write(fen);

        // write which side the opponent is playing
        this.write(this.side == Piece.white ? "b" : "w");
    }

    setOpponent(engineProcess){
        this.opponent = engineProcess;
    }

    // opponent has played a move
    opponentMove(lan){
        this.gameLog += `${lan}\n`;
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

    saveProcLog(procLogDir){
        fs.writeFile(procLogDir, this.procLog, (err) => {
            if (err)
                console.error("Error: ", err);
        });
    }

    saveGameLog(gameLogDir){
        fs.writeFile(gameLogDir, this.gameLog, (err) => {
            if (err)
                console.error("Error: ", err);
        });
    }
}

module.exports = { EngineProcess };
