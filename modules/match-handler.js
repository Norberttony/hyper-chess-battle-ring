
const { Board, StartingFEN } = require("../viewer/scripts/game/game");
const { Piece } = require("../viewer/scripts/game/piece");
const { getAllPositions } = require("./fetch-pos");
const { Engine } = require("./engine");
const { SPRT } = require("./analyze");
const { setGlobalLogId, saveLogs } = require("./logger");

const fs = require("fs");

// contains positions used by the tournament manager.
let usedPositions = {};


// starts a game between two engines. Returns a promise that resolves/rejects when the game ends.
// If the game ends in a draw, promise is resolved with 0. Otherwise, the promise is resolved with
// the winner (e1 or e2).
function startAGame(e1, e2, fen = StartingFEN){
    const board = new Board();
    board.loadFEN(fen);

    return new Promise((res, rej) => {

        const onError = (proc, err) => {
            console.error(err);
            saveLogs(proc, proc.opponent);
            rej(err);
        }

        const onFinish = (proc) => {
            const e1 = proc;
            const e2 = proc.opponent;

            saveLogs(e1, e2);

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
        let fen;
        while (!fen){
            if (positions.length == 0)
                throw new Error("Out of new positions");

            const idx = Math.floor(Math.random() * positions.length);
            fen = positions.splice(idx, 1)[0];

            if (usedPositions[fen])
                fen = undefined;
        }

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

            // this position was now used
            usedPositions[fen] = true;

            // save all of the tournament data
            fs.writeFile("./data/tournaments/used-positions.json", JSON.stringify(usedPositions), (err) => {
                console.error(err);
            });
            const totalResults = {
                [oldVersion.name]: oldVersion.resultTable,
                [newVersion.name]: newVersion.resultTable
            };
            fs.writeFile("./data/tournaments/results.json", JSON.stringify(totalResults), (err) => {
                console.error(err);
            });
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

// reads from a specific folder: data/tournaments
// expects to see under that folder: results.json and used-positions.json
function loadTournamentInfo(oldVersion, newVersion){
    const resultsPath = "./data/tournaments/results.json";
    const usedPosPath = "./data/tournaments/used-positions.json";

    if (!fs.existsSync(resultsPath) || !fs.existsSync(usedPosPath)){
        console.warn(`Could not load tournament info, either ${resultsPath} or ${usedPosPath} does not exist.`);
        return false;
    }

    const results = JSON.parse(fs.readFileSync(resultsPath));
    const usedPos = JSON.parse(fs.readFileSync(usedPosPath));

    // set results if they exist for these versions
    oldVersion.resultTable = results[oldVersion.name] || {};
    newVersion.resultTable = results[newVersion.name] || {};

    const oldResults = oldVersion.getResultRow(newVersion.name);
    const newResults = newVersion.getResultRow(oldVersion.name);

    // calculate the total game count to determine a safe gameId for log files
    const gameCount = oldResults.wins + oldResults.draws + oldResults.losses;
    setGlobalLogId(gameCount);

    
    usedPositions = usedPos;

    return true;
}

module.exports = { startAGame, startADouble, playTournament, loadTournamentInfo };
