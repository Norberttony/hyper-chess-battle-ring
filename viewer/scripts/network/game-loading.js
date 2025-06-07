
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
            gameState.loadPGN(await res.text());
        })
        .catch((err) => {
            console.error(err);
        });
}
