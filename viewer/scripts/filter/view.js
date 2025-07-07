
// handles displaying all of the filtered boards paginated.

const FILTERS_VIEW = {
    // expects games to contain a list of { fen: string, href: string }
    games: [],
    // number of games per page
    per_page: 8,
    // current page number (starts from 0)
    curr_page: 0
};


{
    // set up all of the input radios
    const radios = document.getElementsByClassName("radio");
    for (const r of radios){
        const buttons = r.getElementsByTagName("button");
        for (const b of buttons){
            b.addEventListener("click", () => {
                for (const o of buttons){
                    if (o == b)
                        continue;
                    o.classList.remove("radio__selected");
                }
                b.classList.toggle("radio__selected");

                if (b.classList.contains("radio__selected"))
                    r.setAttribute("value", b.value);
                else
                    r.removeAttribute("value");
            });
        }
    }
}

{
    // populate the constellations filter
    const container = document.getElementsByClassName("filters__constellation")[0];
    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        const pChar = PieceTypeToFEN[i];
        container.innerHTML += `<div class = "filters__const filters__const--type-${pChar}">
            <input type = "number" placeholder = "-">
            <button class = "board-graphics__piece board-graphics__piece--type-${pChar}"></button>
            <button class = "board-graphics__piece board-graphics__piece--type-${pChar}"></button>
            <input type = "number" placeholder = "-">
        </div>`;
    }

    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        const filt = container.getElementsByClassName("filters__const")[i - Piece.king];
        const inputs = filt.getElementsByTagName("input");
        const buttons = filt.getElementsByTagName("button");

        for (let j = 0; j < 2; j++){
            const b = buttons[j];
            const inp = inputs[j];
            b.addEventListener("click", () => {
                inp.value = 1;
                inp.parentNode.setAttribute(j == 0 ? "value-white" : "value-black", inp.value);
                inp.select();
                b.classList.add("radio__selected");
            });

            inp.addEventListener("change", () => {
                inp.parentNode.setAttribute(j == 0 ? "value-white" : "value-black", inp.value);
                if (inp.value)
                    b.classList.add("radio__selected");
                else
                    b.classList.remove("radio__selected");
            });
        }
    }
}


function nextPage(){
    updateCurrPage(FILTERS_VIEW.curr_page + 1);
}

function prevPage(){
    updateCurrPage(FILTERS_VIEW.curr_page - 1);
}

function updateCurrPage(page){
    FILTERS_VIEW.curr_page = page;

    const currPageElem = document.getElementsByClassName("page-control__curr-page")[0];
    if (currPageElem)
        currPageElem.innerText = page + 1;

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
        (v) => v.constellations.endgame !== undefined && v.result.result == "1/2-1/2"
    );

    const maxPageElem = document.getElementsByClassName("page-control__max-page")[0];
    if (maxPageElem)
        maxPageElem.innerText = Math.ceil(FILTERS_VIEW.games.length / FILTERS_VIEW.per_page);

    console.log(`Filtered down to ${FILTERS_VIEW.games.length} games`);

    updateCurrPage(0);
}
