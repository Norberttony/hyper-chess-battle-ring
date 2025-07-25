
import { BoardWidget } from "/board-modules/graphics/widgets/board-widget.mjs";


export class EngineDebugWidget extends BoardWidget {
    constructor(boardgfx, location){
        super(boardgfx);

        const container = document.createElement("div");
        container.classList.add("board-graphics__engine-debug");
        container.innerHTML = `
            <div class = "engine-debug__container">
                Engine debug
                <textarea class = "engine-debug__txt"></textarea>
            </div>
        `;
        boardgfx.getWidgetElem(location).appendChild(container);

        this.debugElem = container.getElementsByClassName("engine-debug__txt")[0];

        boardgfx.skeleton.addEventListener("variation-change", (event) => {
            const { variation } = event.detail;

            // ensure user is not testing out different moves
            if (variation.isMain()){
                // find the analysis the engine made on this position
                const dbg = boardgfx.state.turn == Piece.white ? this.whiteDebug : this.blackDebug;

                // find where engine started analyzing
                let analysisIdx = dbg.indexOf("position fen");
                let steps = 0;
                while (steps != variation.level){
                    analysisIdx = dbg.indexOf("> position moves", analysisIdx + 1);
                    steps++;
                }

                const start = dbg.indexOf(" > go", analysisIdx) - 1;
                const end = dbg.indexOf("> position moves", analysisIdx + 1);

                this.debugElem.value = dbg.substring(start, end);

                // scroll to bottom
                this.debugElem.scrollTo(0, this.debugElem.scrollHeight);
            }else{
                this.debugElem.value = "";
            }
        });
    }

    setWhiteDebug(debug){
        this.whiteDebug = debug;
    }

    setBlackDebug(debug){
        this.blackDebug = debug;
    }
}
