
import { Board, StartingFEN } from "../viewer/scripts/game/game.mjs";
import { Piece } from "../viewer/scripts/game/piece.mjs";
import { Game_Data } from "./game-data.mjs";


// starts a game between two engines.
// If the game ends in a draw, returns 0. Otherwise, returns the winner (e1 or e2).
export async function startAGame(e1, e2, fen = StartingFEN){
    const board = new Board();
    board.loadFEN(fen);

    // total time and increment in ms
    let wtime = 1000;
    let btime = 1000;
    let winc = 100;
    let binc = 100;

    const p1 = e1.createProcess();
    const p2 = e2.createProcess();

    const moveObjects = [];

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
            moveObjects.push(move);

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

        p1.stop();
        p2.stop();

        let winner;

        if (resultNum == 1)
            winner = e1;
        else if (resultNum == -1)
            winner = e2;
        else
            winner = resultNum;

        return new Game_Data(fen, moveObjects, e1, e2, winner, p1.log, p2.log);
    }
}

export async function startADouble(e1, e2, fen = StartingFEN, logger = undefined){
    const g1 = await startAGame(e1, e2, fen);

    if (g1.winner == -2)
        throw new Error("Game error");

    const g2 = await startAGame(e2, e1, fen);
    
    if (g2.winner == -2)
        throw new Error("Game error");

    if (logger)
        logger.logDouble(g1, g2);

    return [ g1, g2 ];
}
