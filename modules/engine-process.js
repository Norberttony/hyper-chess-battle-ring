
const fs = require("fs");
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

        this.to = setTimeout(() => {
            t.onError(t, "Took too long to respond");
        }, 10000);

        let prevMsg = "";

        this.proc.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");

            if (this.proc){
                clearTimeout(t.to);
                t.to = setTimeout(() => {
                    if (t.proc){
                        t.onError(t, "Took too long to respond");
                    }
                }, 10000);
            }

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

                            clearTimeout(t.to);

                            let logResult;
                            if (t.board.result == "/"){
                                logResult = "0";
                            }else{
                                logResult = t.board.side == Piece.black ? "1" : "-1";
                            }
                            t.gameLog += logResult;
                            t.opponent.gameLog += logResult;

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
        if (this.to)
            clearTimeout(this.to);
        
        if (this.proc){
            this.proc.kill();
            delete this.proc;
        }
    }

    // allows GC to collect this object
    delete(){
        if (this.onError)
            delete this.onError;

        if (this.onFinish)
            delete this.onFinish;

        if (this.engine)
            delete this.engine;
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
