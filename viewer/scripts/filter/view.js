
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

(async () => {
    await module_loader.waitForAll();
    // populate the constellations filter
    const container = document.getElementsByClassName("filters__constellation")[0];
    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        const pChar = PieceTypeToFEN[i];
        container.innerHTML += `<div class = "filters__const filters__const--type-${pChar}">
            <input type = "number" placeholder = "-">
            <button class = "filters__const-white board-graphics__piece board-graphics__piece--type-${pChar}"></button>
            <button class = "filters__const-equals">&equals;</button>
            <button class = "filters__const-black board-graphics__piece board-graphics__piece--type-${pChar}"></button>
            <input type = "number" placeholder = "-">
        </div>`;
    }

    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        const filt = container.getElementsByClassName("filters__const")[i - Piece.king];
        const inputs = filt.getElementsByTagName("input");
        const buttons = filt.getElementsByClassName("board-graphics__piece");
        const equalsButton = filt.getElementsByClassName("filters__const-equals")[0];

        function setInpVal(inp, val){
            inp.value = val;
            if (val !== "" && !isNaN(val))
                filt.setAttribute(inputs[0] == inp ? "value-white" : "value-black", inp.value);
            else
                filt.removeAttribute(inputs[0] == inp ? "value-white" : "value-black");
        }

        equalsButton.addEventListener("click", () => {
            if (!filt.hasAttribute("value-equals")){
                filt.setAttribute("value-equals", true);
                filt.removeAttribute("value-white");
                filt.removeAttribute("value-black");
            }else{
                filt.removeAttribute("value-equals");
                setInpVal(inputs[0], inputs[0].value);
                setInpVal(inputs[1], inputs[1].value);
            }
        });

        for (let j = 0; j < 2; j++){
            const b = buttons[j];
            const inp = inputs[j];

            b.addEventListener("click", () => {
                filt.removeAttribute("value-equals");
                if (inp.value)
                    setInpVal(inp, parseInt(inp.value) + 1);
                else
                    setInpVal(inp, 0);
                inp.select();
            });

            b.addEventListener("contextmenu", (event) => {
                event.preventDefault();
                filt.removeAttribute("value-equals");
                if (inp.value == 0)
                    setInpVal(inp);
                else
                    setInpVal(inp, parseInt(inp.value) - 1);
                inp.select();
            });

            inp.addEventListener("change", () => {
                filt.removeAttribute("value-equals");
                setInpVal(inp, inp.value);
            });
        }
    }
})();


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

        // find the position that should be displayed to the user
        const bg = new BoardGraphics(false, false, container);
        bg.loadPGN(gameData.gamePGN);
        bg.jumpToVariation(bg.variationRoot);
        let jumpToMoveNum = gameData.moveTo;
        while (jumpToMoveNum--)
            bg.nextVariation();
        bg.applyChanges();

        // display result on each board
        const resDiv = document.createElement("div");
        resDiv.classList.add("board-graphics__result");
        resDiv.innerText = gameData.result.result;
        bg.boardDiv.appendChild(resDiv);

        // clicking on the board brings up the game
        container.addEventListener("click", () => {
            const a = document.createElement("a");
            a.href = `${gameData.href}&moveNum=${gameData.moveTo}`;
            a.target = "_blank";
            a.click();
        });
    }
}

function applyFilters(){
    const filtersModule = module_loader.modules["filters"];

    // fetch user input values
    const res = document.getElementsByClassName("filters__result")[0].getAttribute("value");
    const phase = document.getElementsByClassName("filters__phase")[0].getAttribute("value");
    const term = document.getElementsByClassName("filters__termination")[0].getAttribute("value");
    const constellation = [ [ 0 ], [ 0 ] ];
    let hasConstellation = false;

    // fetching the user's chosen constellation takes a little more work...
    for (let i = Piece.king; i <= Piece.immobilizer; i++){
        const pChar = PieceASCII[i].toLowerCase();
        const elem = document.getElementsByClassName(`filters__const--type-${pChar}`)[0];

        const w = elem.getAttribute("value-white");
        const b = elem.getAttribute("value-black");
        const e = elem.getAttribute("value-equals");

        constellation[0][i] = undefined;
        constellation[1][i] = undefined;
        if (!isNaN(parseInt(w)))
            constellation[0][i] = parseInt(w);
        if (!isNaN(parseInt(b)))
            constellation[1][i] = parseInt(b);

        if (e){
            constellation[0][i] = "=";
            constellation[1][i] = "=";
        }

        if (w || b || e)
            hasConstellation = true;
    }

    let wWins = 0;
    let bWins = 0;
    let draws = 0;
    FILTERS_VIEW.games = gameData.filter(
        (v) => {
            v.moveTo = v["game-length"];

            if (phase){
                v.moveTo = v.constellations[phase];
                if (v.moveTo === undefined)
                    return false;
            }

            if (term && v.result.termination != term)
                return false;

            if (res && v.result.result != res)
                return false;

            if (hasConstellation){
                const res = filtersModule.findConstellation(v, constellation);
                const ply = res.ply;
                const c = res.constellation;
                if (!ply)
                    return false;

                v.moveTo = ply;

                if (v.result.result == "1/2-1/2")
                    draws++;
                else if (filtersModule.areConstellationSidesEqual(c[0], constellation[0])){
                    if (v.result.result == "1-0")
                        wWins++;
                    else
                        bWins++;
                }else{
                    if (v.result.result == "0-1")
                        wWins++;
                    else
                        bWins++;
                }
            }

            return true;
        }
    );

    const maxPageElem = document.getElementsByClassName("page-control__max-page")[0];
    if (maxPageElem)
        maxPageElem.innerText = Math.ceil(FILTERS_VIEW.games.length / FILTERS_VIEW.per_page);

    document.getElementsByClassName("stats__filtered-num")[0].innerText = FILTERS_VIEW.games.length;
    document.getElementsByClassName("stats__filtered-max")[0].innerText = gameData.length;

    document.getElementsByClassName("stats__w-const-wins")[0].innerText = wWins;
    document.getElementsByClassName("stats__b-const-wins")[0].innerText = bWins;
    document.getElementsByClassName("stats__const-draws")[0].innerText = draws;

    const total = wWins + bWins + draws;
    document.getElementsByClassName("stats__w-const-perc")[0].innerText = (100 * wWins / total).toFixed(1);
    document.getElementsByClassName("stats__b-const-perc")[0].innerText = (100 * bWins / total).toFixed(1);
    document.getElementsByClassName("stats__const-draws-perc")[0].innerText = (100 * draws / total).toFixed(1);

    updateCurrPage(0);
}
