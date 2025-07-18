
module_loader.waitForAll()
    .then(() => {
        window.gameState = new BoardGraphics(true, true, document.getElementById("main-board"));

        new AnnotatorWidget(gameState);
        new AnimationWidget(gameState);
        new AudioWidget(gameState);
        new EngineDebugWidget(gameState, WIDGET_LOCATIONS.LEFT);
        new EngineWidget(gameState, WIDGET_LOCATIONS.RIGHT);
        new PGNWidget(gameState, WIDGET_LOCATIONS.RIGHT);
        new ExtrasWidget(gameState, WIDGET_LOCATIONS.BOTTOM);
        const players = new PlayersWidget(gameState);

        players.setNames("-", "-");

        gameState.display();
    });

function hideNames(){
    gameState.widgets.PlayersWidget.disable();
}

// prevent focusing on buttons (so that arrow key presses and other things still register on the
// board, even if the user clicks other buttons like "copy PGN")
{
    const buttons = document.getElementsByTagName("button");
    for (const b of buttons){
        b.onmousedown = (event) => {
            event.preventDefault();
        }
    }
}
