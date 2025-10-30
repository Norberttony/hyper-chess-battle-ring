
import { BoardWidget } from "/board-modules/graphics/widgets/board-widget.js";


export class TimeWidget extends BoardWidget {
    constructor(boardgfx){
        super(boardgfx);

        this.blackElem = prepareTimeElem("black");
        this.bTimeLeftElem = this.blackElem.getElementsByClassName("black-time-left")[0];
        this.bTimeSpentElem = this.blackElem.getElementsByClassName("black-time-spent")[0];
        boardgfx.getWidgetElem(WIDGET_LOCATIONS.RIGHT_BLACK).appendChild(this.blackElem);

        this.whiteElem = prepareTimeElem("white");
        this.wTimeLeftElem = this.whiteElem.getElementsByClassName("white-time-left")[0];
        this.wTimeSpentElem = this.whiteElem.getElementsByClassName("white-time-spent")[0];
        boardgfx.getWidgetElem(WIDGET_LOCATIONS.RIGHT_WHITE).appendChild(this.whiteElem);

        boardgfx.skeleton.addEventListener("variation-change", (event) => {
            const { variation } = event.detail;
            this.displayTime(variation);
        });

        boardgfx.skeleton.addEventListener("flip", () => {
            swapDOMElements(this.blackElem, this.whiteElem);
        });
    }

    displayTime(variation){
        this.wTimeSpentElem.innerText = "-:--";
        this.bTimeSpentElem.innerText = "-:--";
        this.wTimeLeftElem.innerText = "-:--";
        this.bTimeLeftElem.innerText = "-:--";
        if (variation.isMain()){
            if (!this.timeData[variation.level])
                return;

            const { wtime, btime } = this.timeData[variation.level];
            this.wTimeLeftElem.innerText = timeToStr(wtime);
            this.bTimeLeftElem.innerText = timeToStr(btime);

            if (variation.level - 1 >= 0){
                const prev = this.timeData[variation.level - 1];
                // determine amount of time spent on the move
                if (this.boardgfx.state.turn == Piece.black)
                    this.wTimeSpentElem.innerText = timeToStr(prev.wtime - wtime + prev.winc);
                else
                    this.bTimeSpentElem.innerText = timeToStr(prev.btime - btime + prev.binc);
            }
        }
    }

    getTimeDataFromDebug(debug){
        const times = [];
        for (const line of debug.split("\n")){
            if (line.startsWith(" > go")){
                // extract wtime and btime from go command
                const wtime = parseInt(line.substring(line.indexOf("wtime ") + 6));
                const btime = parseInt(line.substring(line.indexOf("btime ") + 6));
                const winc = parseInt(line.substring(line.indexOf("winc ") + 5));
                const binc = parseInt(line.substring(line.indexOf("binc ") + 5));
                times.push({ wtime, btime, winc, binc });
            }
        }
        return times;
    }

    // used when loading engine games and all we have are the times put into the engines
    loadTimeDataFromDebug(whiteDebug, blackDebug){
        const wtimes = this.getTimeDataFromDebug(whiteDebug);
        const btimes = this.getTimeDataFromDebug(blackDebug);

        // determine who goes first?
        const wFirstGoIdx = whiteDebug.indexOf(" > go");
        const wFirstPosIdx = whiteDebug.indexOf(" > position moves");

        let copy;
        if (wFirstGoIdx < wFirstPosIdx){
            // white went first
            copy = wtimes;
        }else{
            // black went first
            copy = btimes;
        }

        const timeData = [];
        for (let i = 0; Math.floor(i / 2) < copy.length; i++){
            timeData.push(copy[Math.floor(i / 2)]);
            copy == wtimes ? copy = btimes : copy = wtimes;
        }

        this.timeData = timeData;
    }
}


function prepareTimeElem(side){
    const time = document.createElement("div");
    time.classList.add(`boardgfx__${side}-time-container`);
    time.innerHTML = `
        <div class = "${side}-time-left">-:--</div>
        <div class = "${side}-time-spent">-:--</div>`;
    return time;
}

function timeToStr(ms){
    //             ms   s     m       h
    const mags = [ 1, 1000, 60000, 3600000 ];
    const pads = [ 4, 2, 2, 2 ];
    
    for (let m = 0; m <= mags.length; m++){
        const mag = mags[m];

        // we want to find the largest magnitude that still fits ms
        if (ms / mag > 1 && m != mags.length)
            continue;

        // build the str by separating into "digits" (12:34:56)
        let str = "";
        const stop = m <= 3 ? Math.max(0, m - 2) : Math.max(0, m - 3);
        for (let j = m - 1; j >= stop; j--){
            // change of separator for ms
            if (j == 0){
                if (m - 1 == 0)
                    str += "0";
                str += "."
            }

            const val = Math.floor(ms / mags[j]);
            ms -= val * mags[j];

            str += (val + "").padStart(pads[j], "0");

            // separator between digits
            if (j != stop && j != 1)
                str += ":";
        }
        return str;
    }
}

function swapDOMElements(e1, e2){
    const after2 = e2.nextElementSibling;
    const parent = e2.parentNode;
    e1.replaceWith(e2);
    parent.insertBefore(e1, after2);
}
