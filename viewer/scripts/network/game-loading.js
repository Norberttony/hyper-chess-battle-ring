
const gameLoadingIndexInput = document.getElementById("game-loading_index");

function prevGame(){
    gameLoadingIndexInput.value = parseInt(gameLoadingIndexInput.value) - 1;
    loadGame();
}

function nextGame(){
    gameLoadingIndexInput.value = parseInt(gameLoadingIndexInput.value) + 1;
    loadGame();
}

function loadGame(){
    // request file
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
        if (xhr.readyState == xhr.DONE){
            // load game
            if (xhr.status == 200)
                prettyLoadLANGame(xhr.responseText);
            else
                console.error("Could not load LAN game", xhr.responseText);
        }
    }

    xhr.open("GET", `${gameLoadingIndexInput.value}_game.txt`);
    xhr.send();
}

//evaluateGame(0);

let candidates = [];
let numberOfMoves = 0;
let numberOfTurns = 0;
let numberOfCaptureMoves = 0;
let numberOfCaptures1 = 0;
let numberOfCaptures2 = 0;
let numberOfCaptures3 = 0;
let numberOfCaptures4 = 0;
let numberOfCaptures5 = 0;
let dbFormat = ``;

function loadLANGame(notation){
    const nSplit = notation.split("\n");
    const fen = nSplit[0].replace("FEN: ", "");
    gameState.loadFEN(fen);

    const wp = nSplit[1].replace("White: ", "");
    const bp = nSplit[2].replace("Black: ", "");

    let moveStr = ``;
    let result;

    const board = gameState.state;

    for (const uci of notation.split("\n")){

        const allMoves = board.generateMoves(true);
        numberOfTurns++;
        numberOfMoves += allMoves.length;

        for (const m of allMoves){
            if (m.captures.length > 0)
                numberOfCaptureMoves++;
            if (m.captures.length == 1)
                numberOfCaptures1++;
            else if (m.captures.length == 2)
                numberOfCaptures2++;
            else if (m.captures.length == 3)
                numberOfCaptures3++;
            else if (m.captures.length == 4)
                numberOfCaptures4++;
            else if (m.captures.length == 5)
                numberOfCaptures5++;
        }

        const sq = algebraicToSquare(uci);
        // go through all possible moves
        const moves = board.generatePieceMoves(sq, board.squares[sq]);

        if (!isNaN(uci) && uci.length > 0){
            result = uci;
            break;
        }

        for (const m of moves){
            if (m.uci == uci){
                moveStr += " " + getMoveSAN(board, m);
                board.makeMove(m);
                break;
            }
        }
    }

    if (!result){
        if (board.result == "/")
            result = "0";
        else
            // whoever got checkmated is whoever it is to play right now.
            result = board.turn == Piece.white ? "-1" : "1";
    }

    dbFormat += `${fen}\t${wp}\t${bp}\t${result}\t\t${moveStr}\n`;
}

function prettyLoadLANGame(notation){
    const notationElems = notation.split("\n");
    
    const fen = notationElems[0];
    gameState.loadFEN(fen.replace("FEN: ", ""));
    
    for (const uci of notationElems){
        const move = gameState.state.getLANMove(uci);
        if (move)
            gameState.makeMove(move);
    }
    gameState.applyChanges();

    // load player names
    const white = notationElems[1].replace("White: ", "").trim();
    const black = notationElems[2].replace("Black: ", "").trim();

    // determine white and black scores
    let resultElem = notationElems[notationElems.length - 2];
    let whiteScore = "-";
    let blackScore = "-";

    if (resultElem == "0"){
        whiteScore = "1/2";
        blackScore = "1/2";
    }else if (resultElem == "-1"){
        whiteScore = "0";
        blackScore = "1";
    }else if (resultElem == "1"){
        whiteScore = "1";
        blackScore = "0";
    }
    
    // display player names and result
    gameState.setNames(`${white} | ${whiteScore}`, `${black} | ${blackScore}`);
}

const materialPoints = [ 0, 0, 300, 900, 400, 1100, 100, 1300 ];

function evaluateGame(index){
    console.log(`Consider game ${index}`);
    const xhr = new XMLHttpRequest();

    xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.status == 200){
            loadLANGame(xhr.responseText);
            const board = gameState.state;
            if (board.isGameOver() == "#"){
                // after a player delivers checkmate, it's technically the opponent's turn (who has no response).
                // therefore, the winner is whoever's turn it is not.
                const winner = board.turn == Piece.black ? Piece.white : Piece.black;
                const winnerPerspective = winner == Piece.white ? 1 : -1;

                let materialEval = 0;

                for (const s of board.squares){
                    const perspective = Piece.getColor(s) == Piece.white ? 1 : -1;
                    materialEval += perspective * materialPoints[Piece.getType(s)];
                }

                if (materialEval * winnerPerspective <= -600 && !board.isImmobilized(board.kings[board.turn == Piece.white ? 0 : 1], board.turn | Piece.king)){
                    console.log("Candidate!");
                    candidates.push(xhr.responseText);
                }
            }
            evaluateGame(index + 1);
        }
    }

    xhr.open("GET", `${index}_game.txt`);
    xhr.send();
}
