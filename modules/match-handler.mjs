
import { getPGNDateNow } from "hyper-chess-board/pgn";
import { Board, StartingFEN, Piece } from "hyper-chess-board";
import { Game_Data } from "./game-data.mjs";


// starts a game between two engines.
// If the game ends in a draw, returns 0. Otherwise, returns the winner (e1 or e2).
export async function startAGame(e1, e2, round, fen = StartingFEN, timeControl, listener = () => 0){
    const board = new Board();
    board.loadFEN(fen);

    const startingDate = getPGNDateNow();
    listener({ cmd: "newgame", fen, white: e1.name, black: e2.name });

    // total time and increment in ms
    let wtime = timeControl.time;
    let btime = timeControl.time;
    let winc = timeControl.inc;
    let binc = timeControl.inc;

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

        while (!board.isGameOver()){
            const activeProcess = board.turn == Piece.white ? p1 : p2;

            const currFEN = board.getFEN();
            await activeProcess.prompt("isready", "readyok");

            const goCmd = `go wtime ${wtime} winc ${winc} btime ${btime} binc ${binc}`;

            const start = new Date();
            const uciMove = await activeProcess.prompt(goCmd, "bestmove", 10000);
            const end = new Date();

            wtime += winc;
            btime += binc;

            // subtract elapsed time.
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

            const lan = uciMove.split(" ")[1];

            listener({ cmd: "move", lan });

            p1.write(`position moves ${lan}`);
            p2.write(`position moves ${lan}`);

            const move = board.getMoveOfLAN(lan);
            if (!move){
                const winner = board.turn == Piece.white ? Piece.black : Piece.white;
                board.setResult(winner == Piece.black ? "0-1" : "1-0", "illegal move", winner);
                throw new Error(`Could not find move of LAN ${lan} for FEN ${currFEN}, fault is in ${activeProcess.engine.name}`);
            }
            board.makeMove(move);
            moveObjects.push(move);

            if (board.halfmoves[0] >= 100){
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
        let winner = -2;
        if (board.result){
            if (board.result.result == "1/2-1/2")
                winner = 0;
            else if (board.result.result == "1-0")
                winner = e1;
            else if (board.result.result == "0-1")
                winner = e2;
        }

        p1.stop();
        p2.stop();

        listener({ cmd: "endgame", result: board.result });

        return new Game_Data(
            startingDate,
            round,
            fen,
            moveObjects,
            e1,
            e2,
            board.result,
            winner,
            p1.log,
            p2.log,
            timeControl
        );
    }
}
