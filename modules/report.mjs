
import { getSum } from "./filters.mjs";


export function generateReport(games){
    console.log(`A total of ${games.length} games were played.`);
    
    const totalPlies = getSum(games, [ "game-length" ]);
    console.log(`A total of ${totalPlies} moves were played.`);

    const captureCounts = [
        getSum(games, [ "capture-count", 0 ]),
        getSum(games, [ "capture-count", 1 ]),
        getSum(games, [ "capture-count", 2 ]),
        getSum(games, [ "capture-count", 3 ]),
        getSum(games, [ "capture-count", 4 ]),
        getSum(games, [ "capture-count", 5 ])
    ];

    let totalCaptures = 0;
    for (let i = 1; i <= 5; i++){
        totalCaptures += captureCounts[i];
    }

    console.log(`A total of ${totalCaptures + captureCounts[0]} of moves were available to choose from.`);
    console.log(`Available noncapturing moves: ${captureCounts[0]}`);
    console.log(`Available 1 piece capture moves: ${captureCounts[1]}`);
    console.log(`Available 2 piece capture moves: ${captureCounts[2]}`);
    console.log(`Available 3 piece capture moves: ${captureCounts[3]}`);
    console.log(`Available 4 piece capture moves: ${captureCounts[4]}`);
    console.log(`Available 5 piece capture moves: ${captureCounts[5]}`);

    console.log("");

    console.log(`In total, there were ${totalCaptures} capturing moves.`);
    console.log(`On average, there were ${totalCaptures / totalPlies} capturing moves on every turn.`);

    console.log("");

    console.log(`Mean branching factor: ${(totalCaptures + captureCounts[0]) / totalPlies}`);

    console.log("");
}
