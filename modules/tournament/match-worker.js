
import fs from "node:fs";
import { parentPort, workerData } from "node:worker_threads";

import { Board, Piece } from "hyper-chess-board";
import { getPGNDateNow } from "hyper-chess-board/pgn";
import { EngineProcess } from "./engine-process.js";
import { GameData, convertGameDataToPGN } from "./game-data.js";

parentPort.on("message", ({ white, black, fen, round, timeControl, path, wdbgPath, bdbgPath }) => {
    const setup = {
        w: new EngineProcess(white.path),
        b: new EngineProcess(black.path),
        white, black, fen, round, timeControl, path, wdbgPath, bdbgPath
    };

    playGame(setup)
        .then(data => {
            parentPort.postMessage({ type: "result", data });
        })
        .catch(err => {
            console.error(err);
            parentPort.postMessage({ type: "error", err });
        })
        .finally(() => {
            setup.w.stop();
            setup.b.stop();
        });
});

async function playGame({ w, white, b, black, fen, round, timeControl, path, wdbgPath, bdbgPath }){
    const startDate = getPGNDateNow();

    // set up the board
    const board = new Board();
    board.loadFEN(fen);

    // set up the clocks
    let wtime = timeControl.time;
    let btime = timeControl.time;
    const winc = timeControl.inc;
    const binc = timeControl.inc;

    // set up the engines
    await w.prompt("uciready", "uciok");
    await b.prompt("uciready", "uciok");

    await w.prompt("isready", "readyok");
    await b.prompt("isready", "readyok");

    let posCmd = `position fen ${fen}`;
    let isFirstMove = true;
    const moveObjects = [];

    while (!board.isGameOver()){
        const currTime = board.turn == Piece.white ? wtime : btime;
        const active = board.turn == Piece.white ? w : b;

        active.write(posCmd);

        const goCmd = `go wtime ${Math.round(wtime)} btime ${Math.round(btime)} winc ${winc} binc ${binc}`;

        const start = performance.now();
        const bestMoveCmd = await active.prompt(goCmd, "bestmove", currTime + 100);
        const end = performance.now();

        // progress time...
        if (board.turn == Piece.white)
            wtime -= end - start;
        else
            btime -= end - start;

        if (wtime <= 0){
            board.setResult("0-1", "time out", Piece.black);
            break;
        }else if (btime <= 0){
            board.setResult("1-0", "time out", Piece.white);
            break;
        }

        if (board.turn == Piece.white)
            wtime += winc;
        else
            btime += binc;

        // get the move and play it on the board
        const lan = bestMoveCmd.split(" ")[1];
        const move = board.getMoveOfLAN(lan);
        if (!move){
            const currFEN = board.getFEN();
            const winner = board.turn == Piece.white ? Piece.black : Piece.white;
            board.setResult(winner == Piece.black ? "0-1" : "1-0", "illegal move", winner);
            throw new Error(`Could not find move of LAN ${lan} for FEN ${currFEN}, fault is in ${active.path}`);
        }
        board.makeMove(move);

        if (isFirstMove){
            posCmd += " moves ";
            isFirstMove = false;
        }
        posCmd += `${lan} `;
        moveObjects.push(move);
        parentPort.postMessage({ type: "move", lan, wtime, btime });
    }

    let winner = -2;
    if (board.result.result == "1-0")
        winner = white;
    else if (board.result.result == "0-1")
        winner = black;
    else if (board.result.result == "1/2-1/2")
        winner = 0;

    const data = new GameData(
        startDate,
        round,
        fen,
        moveObjects,
        white,
        black,
        board.result,
        winner,
        timeControl
    );

    // saves the game to the path
    if (path){
        const pgn = convertGameDataToPGN(data, workerData.event);
        saveFile(path, pgn, round);
    }

    if (wdbgPath)
        saveFile(wdbgPath, w.log, round);
    if (bdbgPath)
        saveFile(bdbgPath, b.log, round);

    return data;
}

function saveFile(path, data, round){
    fs.writeFile(path, data, (err) => {
        if (err){
            console.error(`ERROR when writing file "${path}" for game ${round}:`, err);
            console.log(data);
        }
    });
}
