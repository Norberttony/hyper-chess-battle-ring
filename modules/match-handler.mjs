
import { Board, StartingFEN } from "../viewer/scripts/game/game.mjs";
import { Piece } from "../viewer/scripts/game/piece.mjs";
import { saveLogs } from "./logger.mjs";
import { exportGame } from "./database.mjs";


// starts a game between two engines.
// If the game ends in a draw, returns 0. Otherwise, returns the winner (e1 or e2).
export async function startAGame(e1, e2, fen = StartingFEN){
    const board = new Board();
    board.loadFEN(fen);

    // total time and increment in ms
    let wtime = 10000;
    let btime = 10000;
    let winc = 100;
    let binc = 100;

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

        const repeats = {};
        repeats[board.getPosition()] = 1;
        let lastCapture = 0;

        while (!board.isGameOver()){
            const activeProcess = board.turn == Piece.white ? p1 : p2;

            const currFEN = board.getFEN();
            await activeProcess.prompt("isready", "readyok");

            const start = new Date();
            const uciMove = await activeProcess.prompt(`go wtime ${wtime} winc ${winc} btime ${btime} binc ${binc}`, "bestmove", 10000);
            const end = new Date();

            // subtract elapsed time...
            if (board.turn == Piece.white)
                wtime += winc - (end - start);
            else
                btime += binc - (end - start);

            if (wtime <= 0){
                board.setResult("0-1", "time out", Piece.black);
                break;
            }else if (btime <= 0){
                board.setResult("1-0", "time out", Piece.white);
                break;
            }

            const lan = uciMove.split(" ")[1];

            p1.write(`position moves ${lan}`);
            p2.write(`position moves ${lan}`);

            const move = board.getMoveOfLAN(lan);
            if (!move){
                throw new Error(`Could not find move of LAN ${lan} for FEN ${currFEN}`);
            }
            board.makeMove(move);

            gameLog += `${lan}\n`;

            lastCapture++;
            if (move.captures.length > 0){
                lastCapture = 0;
            }else if (lastCapture >= 100){
                board.setResult("1/2-1/2", "fifty move rule", 0);
                break;
            }

            const pos = board.getPosition();
            if (!repeats[pos])
                repeats[pos] = 1;
            else
                repeats[pos]++;

            if (repeats[pos] >= 3){
                board.setResult("1/2-1/2", "threefold repetition", 0);
                break;
            }
        }
    }
    catch(err){
        console.error(err);
    }
    finally {
        let resultNum = -2;
        if (board.result.result == "1/2-1/2")
            resultNum = 0;
        else if (board.result.result == "1-0")
            resultNum = 1;
        else if (board.result.result == "0-1")
            resultNum = -1;

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

export async function startADouble(e1, e2, fen = StartingFEN){
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
