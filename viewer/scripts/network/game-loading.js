
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
    let path = `/${tournamentOptionsSelect.value}/${gameLoadingIndexInput.value}`;

    // request file
    fetch(path)
        .then(async (res) => {
            const { gamePgn, whiteDebug, blackDebug } = await res.json();
            gameState.loadPGN(gamePgn);
            widgets.engine_debug.setWhiteDebug(whiteDebug);
            widgets.engine_debug.setBlackDebug(blackDebug);
        })
        .catch((err) => {
            console.error(err);
        });
}
