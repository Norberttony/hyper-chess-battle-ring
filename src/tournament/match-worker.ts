import fs, { PathLike } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";
import { Board } from "hyper-chess-board";
import { getPGNDateNow } from "hyper-chess-board/dist/pgn";
import { EngineProcess } from "./engine-process.js";
import { GameData, convertGameDataToPGN } from "./game-data.js";
import { Bot, ReadyGame } from "./tournament.js";
import { Side } from "hyper-chess-board";

if (parentPort === null)
    throw new Error("Match worker: parent port is null");

parentPort.on("message", ({ white, black, fen, round, timeControl, path, wdbgPath, bdbgPath }: ReadyGame) => {
    const setup: Required<ReadyGame> = {
        w: new EngineProcess(white.path),
        b: new EngineProcess(black.path),
        white, black, fen, round, timeControl, path, wdbgPath, bdbgPath
    };

    playGame(setup)
        .then(data => {
            parentPort?.postMessage({ type: "result", data });
        })
        .catch(err => {
            console.error(err);
            parentPort?.postMessage({ type: "error", err });
        })
        .finally(() => {
            setup.w.stop();
            setup.b.stop();
        });
});

async function playGame({ w, white, b, black, fen, round, timeControl, path, wdbgPath, bdbgPath }: Required<ReadyGame>){
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
        const currTime = board.getTurn() == Side.White ? wtime : btime;
        const active = board.getTurn() == Side.White ? w : b;

        active.write(posCmd);

        const goCmd = `go wtime ${Math.round(wtime)} btime ${Math.round(btime)} winc ${winc} binc ${binc}`;

        const start = performance.now();
        const bestMoveCmd = await active.prompt(goCmd, "bestmove", currTime + 1000);
        const end = performance.now();

        // progress time...
        if (board.getTurn() == Side.White)
            wtime -= end - start;
        else
            btime -= end - start;

        if (wtime <= 0){
            board.setResult("0-1", "time out", Side.Black);
            break;
        }else if (btime <= 0){
            board.setResult("1-0", "time out", Side.White);
            break;
        }

        if (board.getTurn() == Side.White)
            wtime += winc;
        else
            btime += binc;

        // get the move and play it on the board
        const lan = bestMoveCmd.split(" ")[1];
        const move = board.getMoveOfLAN(lan);
        if (!move){
            const currFEN = board.getFEN();
            const winner = board.getTurn() == Side.White ? Side.Black : Side.White;
            board.setResult(winner == Side.Black ? "0-1" : "1-0", "illegal move", winner);

            // save the game to an error log
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

            const pgn = convertGameDataToPGN(data);
            fs.appendFileSync("err.txt", `Could not find move of LAN ${lan} for FEN ${currFEN}, fault is in ${active.path}:\n${pgn}\n\n`);
            console.error(`Could not find move of LAN ${lan} for FEN ${currFEN}, fault is in ${active.path}`);
            break;
        }
        board.makeMove(move);

        if (isFirstMove){
            posCmd += " moves ";
            isFirstMove = false;
        }
        posCmd += `${lan} `;
        moveObjects.push(move);
        parentPort?.postMessage({ type: "move", lan, wtime, btime });
    }

    let winner: Bot | number = -2;
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

function saveFile(path: PathLike, data: string | NodeJS.ArrayBufferView, round: string){
    fs.writeFile(path, data, (err) => {
        if (err){
            console.error(`ERROR when writing file "${path}" for game ${round}:`, err);
            console.log(data);
        }
    });
}
