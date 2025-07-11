
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

            readSearchParams();
        });

    tournamentOptionsSelect.addEventListener("change", loadGame);
}

// use the search parameters to set up the game
async function readSearchParams(){
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tournament");
    const g = params.get("gameId");
    if (t && g){
        tournamentOptionsSelect.value = t;
        gameLoadingIndexInput.value = g;
        await loadGame();
        const m = params.get("moveNum");
        if (m){
            gameState.jumpToVariation(gameState.variationRoot);
            let mInt = parseInt(m);
            while (--mInt >= 0)
                gameState.nextVariation();
            gameState.applyChanges();
        }
    }
}


function prevGame(){
    gameLoadingIndexInput.value = parseInt(gameLoadingIndexInput.value) - 1;
    loadGame();
}

function nextGame(){
    gameLoadingIndexInput.value = parseInt(gameLoadingIndexInput.value) + 1;
    loadGame();
}

async function loadGame(){
    let path = `/${tournamentOptionsSelect.value}/${gameLoadingIndexInput.value}`;

    // request file
    const res = await fetch(path);
    const { gamePgn, whiteDebug, blackDebug } = await res.json();
    gameState.loadPGN(gamePgn);
    gameState.widgets.EngineDebugWidget.setWhiteDebug(whiteDebug);
    gameState.widgets.EngineDebugWidget.setBlackDebug(blackDebug);
}
