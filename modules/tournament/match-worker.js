
import { parentPort } from "node:worker_threads";

import { Board, Piece } from "hyper-chess-board";
import { getPGNDateNow } from "hyper-chess-board/pgn";
import { EngineProcess } from "./engine-process.js";
import { GameData } from "./game-data.js";


parentPort.on("message", ({ white, black, fen, round, timeControl }) => {
    const setup = {
        w: new EngineProcess(white.path),
        b: new EngineProcess(black.path),
        white: white.name,
        black: black.name,
        fen, round, timeControl
    };

    playGame(setup)
        .then(data => {
            parentPort.postMessage({ type: "finish", data });
        })
        .catch(err => {
            parentPort.postMessage({ type: "error", err });
        })
        .finally(() => {
            setup.w.stop();
            setup.b.stop();
        });
});

async function playGame({ w, white, b, black, fen, timeControl }){
    const startDate = getPGNDateNow();

    // set up the board
    const board = new Board();
    board.loadFEN(fen);

    // set up the clocks
    let wtime = timeControl.time;
    let btime = timeControl.time;
    const winc = timeControl.inc;
    const binc = timeControl.binc;

    // set up the engines
    await w.prompt("uciready", "uciok");
    await b.prompt("uciready", "uciok");

    await w.prompt("isready", "readyok");
    await b.prompt("isready", "readyok");

    let posCmd = `position fen ${fen}`;
    let isFirstMove = true;
    const lans = [];

    while (!board.isGameOver()){
        const currFEN = board.getFEN();
        const currTime = board.turn == Piece.white ? wtime : btime;
        const active = board.turn == Piece.white ? w : b;

        await active.prompt(posCmd);

        const goCmd = `go wtime ${wtime} btime ${btime} winc ${winc} binc ${binc}`;

        const start = new Date();
        const bestMoveCmd = await active.prompt(goCmd, "bestmove", currTime + 100);
        const end = new Date();

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
        parentPort.postMessage({ type: "move", lan });
        const move = board.getMoveOfLAN(lan);
        if (!move){
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
        lans.push(lan);
    }

    let winner = -2;
    if (board.result.result == "1-0")
        winner = white;
    else if (board.result.result == "0-1")
        winner = black;
    else
        winner = 0;

    return new GameData(
        startDate,
        round,
        fen,
        lans,
        white.name,
        black.name,
        board.result,
        winner,
        w.log,
        b.log,
        timeControl
    );
}
