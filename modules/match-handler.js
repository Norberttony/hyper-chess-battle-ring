
const { Board, StartingFEN } = require("../viewer/scripts/game/game");
const { Piece } = require("../viewer/scripts/game/piece");
const { getAllPositions } = require("./fetch-pos");
const { Engine } = require("./engine");
const { SPRT } = require("./analyze");
const fs = require("fs");

// starts a game between two engines. Returns a promise that resolves/rejects when the game ends.
// If the game ends in a draw, promise is resolved with 0. Otherwise, the promise is resolved with
// the winner (e1 or e2).
function startAGame(e1, e2, fen = StartingFEN){
    const board = new Board();
    board.loadFEN(fen);

    return new Promise((res, rej) => {

        const onError = (proc, err) => {
            console.error(err);
            rej(err);
        }

        const onFinish = (proc) => {
            const e1 = proc;
            const e2 = proc.opponent;
            if (board.isGameOver()){

                if (board.result == "/"){
                    res(0);
                }else if (board.result == "#"){
                    // one of the players won...
                    if (e1.engine.side == e1.board.turn){
                        // e1 got checkmated, so e1 lost
                        res(e2.engine);
                    }else{
                        res(e1.engine);
                    }
                }

            }else{
                rej("Processes finished but game is not over");
            }
        }

        // players suddenly appear
        const e1proc = e1.createProcess(onFinish, onError);
        const e2proc = e2.createProcess(onFinish, onError);

        // players walk up to the board
        e1proc.setOpponent(e2proc);
        e2proc.setOpponent(e1proc);

        // players shake hands and begin
        e1proc.setup(board, Piece.white);
        e2proc.setup(board, Piece.black);

    });
}

async function startADouble(e1, e2, fen = StartingFEN){
    const w1 = await startAGame(e1, e2, fen);
    const l1 = w1 == e1 ? e2 : e1;
    const w2 = await startAGame(e2, e1, fen);
    const l2 = w2 == e1 ? e2 : e1;

    return [ w1, l1, w2, l2 ];
}

async function playTournament(oldVersion, newVersion, threads){
    const positions = getAllPositions();

    const round = async () => {
        const idx = Math.floor(Math.random() * positions.length);
        const fen = positions.splice(idx, 1)[0];

        try {

            // play a game and interpret the results
            const [ w1, l1, w2, l2 ] = await startADouble(oldVersion, newVersion, fen);
            if (w1 == 0){
                Engine.addResult(oldVersion, newVersion, 0);
            }else{
                Engine.addResult(w1, l1, 1);
            }

            if (w2 == 0){
                Engine.addResult(oldVersion, newVersion, 0);
            }else{
                Engine.addResult(w2, l2, 1);
            }
        }
        catch(err){
            console.error(err);
        }
        finally {
            // since the results might have changed, perform SPRT
            const results = newVersion.getResultRow(oldVersion.name);
            
            const hyp = SPRT(results.wins, results.draws, results.losses, 0, 20, 0.01, 0.01);
            if (!hyp){
                // silly way of preventing stack overflow
                setTimeout(round, 1);
            }else{
                console.log("Accept", hyp);
            }
        }
    }

    for (let i = 0; i < threads; i++){
        round();
    }
}

module.exports = { startAGame, startADouble, playTournament };
