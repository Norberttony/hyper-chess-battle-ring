
const module_loader = new Module_Loader();

{
    // makes the assumption that this is a .js file located under ./scripts/game
    const gameScripts = [ "coords", "board", "move", "piece", "pre-game", "san" ];
    const localWidgets = [ "engine-debug-widget", "time-widget" ]

    for (const scriptName of gameScripts)
        module_loader.load(`/board-modules/game/${scriptName}.js`).then(globalize);
    for (const scriptName of localWidgets)
        module_loader.load(`/scripts/graphics/widgets/${scriptName}.js`).then(globalize);
    module_loader.load("/board-modules/pgn/index.js", "pgn-file-reader").then(globalize);
    module_loader.load("/board-modules/graphics/index.js").then(globalize);
    module_loader.load("/board-modules/graphics/widgets/index.js").then(globalize);

    module_loader.waitForAll().then(() => {
        initInput();
        console.log("Modules loaded.");
    });
}
