# Hyper Chess Battle Ring
This project is specifically designed for a variant of Chess known as Hyper Chess. The hyper chess battle ring provides a way of creating tournaments between two engines, and validating the results of the tournament using sequential probability ratio test (SPRT). Tournaments are created and managed using the CLI. There is also a web server hosted automatically that allows viewing all finished games, and filtering the games for specific features.

The rules for Hyper Chess are provided [here](https://www.carusos.org/Hyperchess/hyperchess.html). The non-MIT rules (death squares do not persist) are used.

## Tournament Handling
The CLI provides a set of commands to create, manage, and play tournaments between two engines. Here is the list of commands:
- `tournament`: used to view a specific tournament or create a new tournament, once in a tournament dashboard, the commands change:
  - `play`: starts the tournament
  - `add`: adds a player to the tournament
  - `remove`: removes a player from the tournament
  - `quit`: quits the tournament dashboard and returns to the CLI
- `exit`: closes the CLI but not the web server

Currently, the only supported tournament mode is SPRT, where a new version of the engine is tested against the old version. SPRT is used to verify that the results are statistically significant, which would mean establishing a confidence of the new version being stronger (or not stronger) than the old version.

## Game Filtering
<img width="1310" height="1482" alt="battle-ring-filter" src="https://github.com/user-attachments/assets/670ceafc-9df9-447c-b024-54110efb9a3a" />
Applying filters will go through every game in the tournament and only display games that match the currently selected settings. The position that is displayed for each game is not always the final one, but instead the exact position that matches the filter specifications in the game. The boards link to the analysis tab and automatically navigate to the selected position.

The most interesting filter is the material constellation filter (shown as the assortment of pieces). It filters for positions that match the given piece counts on either side. If no piece count is provided (and the "equals" is not selected) then that material is ignored. The filter is also side-agnostic, meaning that searching for a material imbalance for white will also show positions with the same material imbalance but for black. Using this feature, it is easy to see the engine's performance when handling with specific piece configurations (as well as performance in easily-winnable endgames).

Here is the full list of features:
* Filtering by the game's result, termination, opening phase, or material constellation/configuration
* Applying the same set of filters to a different tournament in one click
* Navigating to any of the displayed games to analyze them further
* Viewing the engine's weaknesses and strengths based on the games' cumulative outcomes

## Game Analysis
<img width="1310" height="915" alt="battle-ring-analyze" src="https://github.com/user-attachments/assets/0ff6cb17-72c5-4f8d-aace-2ca59feed10e" />
When a specific game is selected, the analysis tab opens, displaying the selected position and allowing navigation. It is possible to change tournaments, games, or scroll through this game. For convenience, a WASM build of the engine (taken from another one of my [projects](https://github.com/Norberttony/hyper-chess-engine)) was also embedded into the analysis tab. This means that an engine of higher depth can be used to get a more accurate evaluation and understanding of the position. The full list of features includes:
* Fetching/setting the FEN and PGN of the game
* Displaying both of the engines' debug for the currently shown position
* Navigating to other games or even tournaments
* Analyzing the current position with the help of another engine
