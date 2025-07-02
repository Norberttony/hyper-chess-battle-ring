
class EngineDebugWidget extends BoardWidget {
    constructor(boardgfx, location){
        super(boardgfx, "engine-debug");

        const container = document.createElement("div");
        container.classList.add("board-graphics__engine-debug");
        container.innerHTML = `
            <div class = "engine-debug__container">
                White debug
                <textarea class = "engine-debug__white"></textarea>
            </div>
            <div class = "engine-debug__container">
                Black debug
                <textarea class = "engine-debug__black"></textarea>
            </div>
        `;
        boardgfx.getWidgetElem(location).appendChild(container);

        this.whiteDebugElem = container.getElementsByClassName("engine-debug__white")[0];
        this.blackDebugElem = container.getElementsByClassName("engine-debug__black")[0];

        boardgfx.skeleton.addEventListener("variation-change", (event) => {
            const { variation } = event.detail;

            // ensure user is not testing out different moves
            if (variation.isMain()){
                // find the analysis the engine made on this position
                const target = boardgfx.state.turn == Piece.white ? this.whiteDebugElem : this.blackDebugElem;
                const dbg = target.value;

                // find where engine started analyzing
                let analysisIdx = dbg.indexOf("position fen");
                let steps = 0;
                while (steps != variation.level){
                    analysisIdx = dbg.indexOf("> position moves", analysisIdx + 1);
                    steps++;
                }

                const start = dbg.indexOf(" > go", analysisIdx) - 1;
                const end = dbg.indexOf("> position moves", analysisIdx + 1);

                // target.focus();

                // scroll to where this text is located.
                requestAnimationFrame(() => {
                    // something changed
                    if (dbg != target.value)
                        return;
                    target.value = dbg.substring(0, start);
                    const scrollBy = target.scrollHeight == target.clientHeight ? 0 : target.scrollHeight;
                    target.value = dbg;
                    target.scrollTop = scrollBy;
                });

                // target.setSelectionRange(start, end);
            }
        });
    }

    setWhiteDebug(debug){
        this.whiteDebugElem.value = debug;
    }

    setBlackDebug(debug){
        this.blackDebugElem.value = debug;
    }
}
