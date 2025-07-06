
// handles displaying all of the filtered boards paginated.

const FILTERS_VIEW = {
    // expects games to contain a list of { fen: string, href: string }
    games: [],
    // number of games per page
    per_page: 1
};

function applyFilters(){
    const filtered = gameData.filter(
        (v) => v.constellations.lastPhase >= 0 && v.constellations.opening
    );

    console.log(filtered);

    const pagesElem = document.getElementById("pages");
    pagesElem.innerHTML = "";
    for (let i = 0; i < FILTERS_VIEW.per_page; i++){
        const container = document.createElement("div");
        pagesElem.appendChild(container);
        const bg = new BoardGraphics(false, false, container);
        bg.loadPGN(filtered[i].gamePGN);
    }
}
