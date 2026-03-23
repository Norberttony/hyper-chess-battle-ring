
const socket = io();

const gameStates = {};

socket.on("game", async (id, data) => {
    await module_loader.waitForAll();

    let state = gameStates[id];
    if (!state){
        state = new BoardGraphics();
        gameStates[id] = state;

        // add to list
        document.getElementById("game-list").appendChild(state.skeleton);

        // add widgets
        new PlayersWidget(state);
    }

    if (data.type == "newgame"){
        state.loadFEN(data.fen);
        state.setNames(data.white, data.black);
    }else if (data.type == "move"){
        state.addMoveToEndLAN(data.lan);
        if (state.currentVariation.isMain() && !state.currentVariation.next[0]){
            state.nextVariation();
            state.applyChanges(false);
        }
    }
});

module_loader.waitForAll()
    .then(() => {
        window.gameState = new BoardGraphics(true, true, document.getElementById("main-board"));

        new AnnotatorWidget(gameState);
        new AnimationWidget(gameState);
        new AudioWidget(gameState);
        new EngineWidget(gameState, WIDGET_LOCATIONS.RIGHT);
        new PGNWidget(gameState, WIDGET_LOCATIONS.RIGHT);
        new ExtrasWidget(gameState, WIDGET_LOCATIONS.BOTTOM);
        const players = new PlayersWidget(gameState);

        players.setNames("-", "-");

        gameState.display();
    });
