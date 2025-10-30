
let gameData = [];

module_loader.load("/scripts/filter/filters.js");
module_loader.load("/scripts/filter/pipes.js");

// initialize tournamentOptionsSelect with options.
{
    const tournamentOptionsSelect = document.getElementById("tournament-options");

    fetch("tournaments")
        .then(async (res) => {
            const tournamentNames = await res.json();
            for (const name of tournamentNames){
                const option = document.createElement("option");
                option.value = name;
                option.innerText = name.replaceAll("__", " ");
                tournamentOptionsSelect.appendChild(option);
            }
            tournamentOptionsSelect.addEventListener("change", () => {
                prepareTournamentGames(tournamentOptionsSelect.value);
            });
            prepareTournamentGames(tournamentOptionsSelect.getElementsByTagName("option")[0].value);
        });
}

async function prepareTournamentGames(tournamentName){
    await module_loader.waitForAll();

    // prepare modules
    const pgnHandler = module_loader.modules["pgn-file-reader"];
    const filters = module_loader.modules["filters"];
    const pipes = module_loader.modules["pipes"];

    const manager = new pipes.Pipe_Manager([
        new pipes.Game_Length_Pipe(),
        new pipes.Constellations_Pipe(),
        new pipes.Result_Pipe(),
        new pipes.Heatmap_Pipe()
    ]);
    const pgnDatabase = await (await fetch(`${tournamentName}/games`)).text();

    gameData = [];

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
        data.round = headers.Round;
        data.gamePGN = pgn;
        data.href = `/analyze?tournament=${tournamentName}&gameId=${data.round}`;
        gameData.push(data);
    }

    // in the case the the compiled games pgn database is not in sorted order (by round number)...
    gameData.sort((a, b) => a.round - b.round);

    applyFilters();
}
