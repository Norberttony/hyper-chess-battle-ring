
let gameData = [];
let filtersModule;

Promise.all([ import("./pgn-file-reader.mjs"), import("./filters.mjs"), import("./pipes.mjs") ])
    .then(async ([ pgnHandler, filters, pipes ]) => {
        filtersModule = filters;
        await module_loader.waitForAll();

        const path = window.location.pathname.substring(1).split("/");
        if (path.length != 1)
            return;

        const manager = new pipes.Pipe_Manager([
            new pipes.Game_Length_Pipe(),
            new pipes.Constellations_Pipe(),
            new pipes.Result_Pipe()
        ]);
        const tournamentName = decodeURI(path[0]);
        const pgnDatabase = await (await fetch(`${window.location.pathname}/games`)).text();

        gameData = [];

        let id = 1;
        for (const pgn of pgnHandler.splitPGNs(pgnDatabase)){
            const headers = pgnHandler.extractHeaders(pgn);
            const board = new Board();
            if (headers.FEN)
                board.loadFEN(headers.FEN);

            manager.start(board);
            manager.all(board);

            const san = pgnHandler.extractMoves(pgn);
            for (const moveSAN of san.split(" ")){
                const m = board.getMoveOfSAN(moveSAN);
                if (m){
                    board.makeMove(m);
                    manager.all(board, m);
                }
            }

            if (!board.isGameOver() && headers.Result){
                let winner = 0;
                if (headers.Result == "1-0")
                    winner = Piece.white;
                else if (headers.Result == "0-1")
                    winner = Piece.black;
                board.setResult(headers.Result, headers.Termination, winner);
            }

            const data = manager.end(board);
            data.gamePGN = pgn;
            data.href = `/?tournament=${tournamentName}&gameId=${id++}`;
            gameData.push(data);
        }
        applyFilters();
    });
