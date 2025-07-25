
const module_loader = new Module_Loader();

{
    // makes the assumption that this is a .mjs file located under ./scripts/game
    const gameScripts = [ "coords", "game", "move", "piece", "pre-game", "san" ];
    const localWidgets = [ "engine-debug-widget", "time-widget" ]

    for (const scriptName of gameScripts)
        module_loader.load(`/board-modules/game/${scriptName}.mjs`).then(globalize);
    for (const scriptName of localWidgets)
        module_loader.load(`/scripts/graphics/widgets/${scriptName}.mjs`).then(globalize);
    module_loader.load("/board-modules/pgn/index.mjs", "pgn-file-reader").then(globalize);
    module_loader.load("/board-modules/graphics/index.mjs").then(globalize);
    module_loader.load("/board-modules/graphics/widgets/index.mjs").then(globalize);

    module_loader.waitForAll().then(() => {
        initInput();
        console.log("Modules loaded.");
    });
}
