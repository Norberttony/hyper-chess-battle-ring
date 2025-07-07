
// handles displaying all of the filtered boards paginated.

const FILTERS_VIEW = {
    // expects games to contain a list of { fen: string, href: string }
    games: [],
    // number of games per page
    per_page: 8,
    // current page number (starts from 0)
    curr_page: 0
};


function nextPage(){
    updateCurrPage(FILTERS_VIEW.curr_page + 1);
}

function prevPage(){
    updateCurrPage(FILTERS_VIEW.curr_page - 1);
}

function updateCurrPage(page){
    FILTERS_VIEW.curr_page = page;

    const filtered = FILTERS_VIEW.games;

    const pagesElem = document.getElementById("pages");
    pagesElem.innerHTML = "";
    for (let i = 0; i < FILTERS_VIEW.per_page; i++){
        const gameData = filtered[FILTERS_VIEW.curr_page * FILTERS_VIEW.per_page + i];
        if (!gameData)
            return;

        const container = document.createElement("div");
        pagesElem.appendChild(container);
        const bg = new BoardGraphics(false, false, container);
        bg.loadPGN(gameData.gamePGN);

        bg.jumpToVariation(bg.variationRoot);
        let jumpToMoveNum = gameData.constellations.endgame;
        while (jumpToMoveNum--){
            bg.nextVariation();
        }

        bg.applyChanges();

        const resDiv = document.createElement("div");
        resDiv.classList.add("board-graphics__result");
        resDiv.innerText = gameData.result.result;
        bg.skeleton.appendChild(resDiv);

        container.addEventListener("click", () => {
            window.location.href = gameData.href;
        });
    }
}

function applyFilters(){
    FILTERS_VIEW.games = gameData.filter(
        (v) => v.constellations.endgame !== undefined
    );

    console.log(`Filtered down to ${FILTERS_VIEW.games.length} games`);

    updateCurrPage(0);
}
