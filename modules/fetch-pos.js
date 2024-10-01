
const fs = require("fs");

const allPositions = JSON.parse(fs.readFileSync("./data/positions.json").toString());

// returns all positions currently stored in positions.txt
// removes any duplicates in the positions.txt file
function getAllPositions(){
    const positions = [];

    // do a shallow copy to allow modifying the objects when saving positions
    for (const p of allPositions)
        positions.push(p);

    return positions;
}

function savePositions(){
    fs.writeFile("./data/positions.json", JSON.stringify(allPositions), (err) => {
        if (err)
            console.error(err);
    });
}

module.exports = { getAllPositions, savePositions };
