
const socket = io();

socket.on("liveUpdate", async (data) => {
    await module_loader.waitForAll();
    if (data.cmd == "newgame"){
        gameState.loadFEN(data.fen);
        gameState.setNames(data.white, data.black);
    }else if (data.cmd == "move"){
        gameState.addMoveToEndLAN(data.lan);
        if (gameState.currentVariation.isMain() && !gameState.currentVariation.next[0]){
            gameState.nextVariation();
            gameState.applyChanges(false);
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
