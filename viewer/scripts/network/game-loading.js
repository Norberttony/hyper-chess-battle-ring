
const gameLoadingIndexInput = document.getElementById("game-loading_index");
const tournamentOptionsSelect = document.getElementById("tournament-options");


// initialize tournamentOptionsSelect with options.
{
    fetch("tournaments")
        .then(async (res) => {
            const tournamentNames = await res.json();
            for (const name of tournamentNames){
                const option = document.createElement("option");
                option.value = name;
                option.innerText = name.replaceAll("__", " ");
                tournamentOptionsSelect.appendChild(option);
            }
        });

    tournamentOptionsSelect.addEventListener("change", loadGame);
}


function prevGame(){
    gameLoadingIndexInput.value = parseInt(gameLoadingIndexInput.value) - 1;
    loadGame();
}

function nextGame(){
    gameLoadingIndexInput.value = parseInt(gameLoadingIndexInput.value) + 1;
    loadGame();
}

function loadGame(){
    let path;

    if (tournamentOptionsSelect.value == "none")
        path = `/game/${gameLoadingIndexInput.value}`;
    else
        path = `/game/${tournamentOptionsSelect.value}/${gameLoadingIndexInput.value}`;

    // request file
    fetch(path)
        .then(async (res) => {
            prettyLoadLANGame(await res.text());
        })
        .catch((err) => {
            console.error(err);
        });
}

function prettyLoadLANGame(notation){
    const notationElems = notation.split("\n");
    
    const fen = notationElems[0];
    gameState.loadFEN(fen.replace("FEN: ", ""));
    
    for (const uci of notationElems){
        const move = gameState.state.getMoveOfLAN(uci);
        if (move)
            gameState.makeMove(move);
    }
    gameState.applyChanges();

    // load player names
    const white = notationElems[1].replace("White: ", "").trim();
    const black = notationElems[2].replace("Black: ", "").trim();

    // determine white and black scores
    let resultElem = notationElems[notationElems.length - 1].trim();
    let whiteScore = "-";
    let blackScore = "-";

    if (resultElem.startsWith("1/2-1/2")){
        whiteScore = "1/2";
        blackScore = "1/2";
    }else if (resultElem.startsWith("0-1")){
        whiteScore = "0";
        blackScore = "1";
    }else if (resultElem.startsWith("1-0")){
        whiteScore = "1";
        blackScore = "0";
    }

    console.log(resultElem);
    
    // display player names and result
    gameState.setNames(`${white} | ${whiteScore}`, `${black} | ${blackScore}`);
}
