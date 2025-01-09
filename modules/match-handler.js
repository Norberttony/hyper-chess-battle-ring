
const { Board, StartingFEN } = require("../viewer/scripts/game/game");
const { Piece } = require("../viewer/scripts/game/piece");
const { getAllPositions, savePositions } = require("./fetch-pos");
const { Engine } = require("./engine");
const { SPRT } = require("./analyze");
const { setGlobalLogId, saveLogs } = require("./logger");
const { exportGame } = require("./database");

const fs = require("fs");

// contains positions used by the tournament manager.
let usedPositions = {};


// starts a game between two engines.
// If the game ends in a draw, returns 0. Otherwise, returns the winner (e1 or e2).
async function startAGame(e1, e2, fen = StartingFEN){
    const board = new Board();
    board.loadFEN(fen);

    const p1 = e1.createProcess();
    const p2 = e2.createProcess();

    let gameLog = `FEN: ${fen}\nWhite: ${e1.name}\nBlack: ${e2.name}\n`;

    try {
        // ensure all engines are ready
        await p1.prompt("uciready", "uciok");
        await p2.prompt("uciready", "uciok");

        p1.write(`position fen ${fen}`);
        p2.write(`position fen ${fen}`);

        await p1.prompt("isready", "readyok");
        await p2.prompt("isready", "readyok");

        while (!board.isGameOver()){
            const activeProcess = board.turn == Piece.white ? p1 : p2;

            const currFEN = board.getFEN();
            activeProcess.write(`position fen ${currFEN}`);
            await activeProcess.prompt("isready", "readyok");

            const uciMove = await activeProcess.prompt("go movetime 200", "bestmove", 10000);
            const lan = uciMove.split(" ")[1];

            const move = board.getLANMove(lan);
            if (!move){
                throw new Error(`Could not find move of LAN ${lan} for FEN ${currFEN}`);
            }
            board.makeMove(move);

            gameLog += `${lan}\n`;
        }
    }
    catch(err){
        console.error(err);
    }
    finally {
        let resultNum = -2;
        if (board.result == "/")
            resultNum = 0;
        else if (board.result == "#")
            resultNum = board.turn == Piece.white ? -1 : 1; // if WTP but no moves that get out of checkmate, black won.

        gameLog += resultNum;

        p1.stop();
        p2.stop();

        // save into logs
        const isError = resultNum == -2;
        const logId = saveLogs(gameLog, e1.name, p1.log, e2.name, p2.log, isError);

        if (resultNum == 1)
            return [ e1, logId ];
        else if (resultNum == -1)
            return [ e2, logId ];
        else if (resultNum == 0)
            return [ 0, logId ];

        return [ resultNum, logId ];
    }
}

async function startADouble(e1, e2, fen = StartingFEN){
    const [ w1, logId1 ] = await startAGame(e1, e2, fen);
    const l1 = w1 == e1 ? e2 : e1;

    if (w1 == -2)
        throw new Error("Game error");

    const [ w2, logId2 ] = await startAGame(e2, e1, fen);
    const l2 = w2 == e1 ? e2 : e1;
    
    if (w2 == -2)
        throw new Error("Game error");

    exportGame(logId1);
    exportGame(logId2);

    return [ w1, l1, w2, l2 ];
}

async function playTournament(oldVersion, newVersion, threads){
    const tournamentObject = {
        playing: true
    };

    const positions = getAllPositions();

    const round = async () => {
        let pos;
        while (!pos){
            // does not throw error to avoid it interrupting any file-related I/O
            if (positions.length == 0)
                return console.error("Out of new positions");

            const idx = Math.floor(Math.random() * positions.length);
            pos = positions.splice(idx, 1)[0];

            if (usedPositions[pos.fen])
                pos = undefined;
        }

        try {

            // play a game and interpret the results
            const [ w1, l1, w2, l2 ] = await startADouble(oldVersion, newVersion, pos.fen);

            if (w1 == 0){
                Engine.addResult(oldVersion, newVersion, 0);
                pos.draws++;
            }else{
                Engine.addResult(w1, l1, 1);
                if (w1 == oldVersion)
                    pos.whiteWins++;
                else
                    pos.blackWins++
            }

            if (w2 == 0){
                Engine.addResult(oldVersion, newVersion, 0);
                pos.draws++;
            }else{
                Engine.addResult(w2, l2, 1);
                if (w1 == newVersion)
                    pos.whiteWins++;
                else
                    pos.blackWins++
            }

            // this position was now used
            usedPositions[pos.fen] = true;

            // save all of the tournament data
            savePositions();
            fs.writeFile("./data/tournaments/used-positions.json", JSON.stringify(usedPositions), (err) => {
                if (err)
                    console.error("Error: ", err);
            });
            const totalResults = {
                [oldVersion.name]: oldVersion.resultTable,
                [newVersion.name]: newVersion.resultTable
            };
            fs.writeFile("./data/tournaments/results.json", JSON.stringify(totalResults), (err) => {
                if (err)
                    console.error("Error: ", err);
            });
        }
        catch(err){
            console.error("Error: ", err);
        }
        finally {
            // since the results might have changed, perform SPRT
            const results = newVersion.getResultRow(oldVersion.name);
            
            const hyp = SPRT(results.wins, results.draws, results.losses, 0, 20, 0.01, 0.01);
            if (!hyp){
                if (tournamentObject.playing){
                    // silly way of preventing stack overflow
                    setTimeout(round, 1);
                }else{
                    console.log("Round finished...");
                }
            }else{
                console.log("Accept", hyp);
            }
        }
    }

    for (let i = 0; i < threads; i++){
        round();
    }

    return tournamentObject;
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
