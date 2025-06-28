
{
    const path = window.location.pathname.substring(1).split("/");
    if (path.length == 1){
        const tournamentName = decodeURI(path[0]);
        fetch(`${window.location.pathname}/games`)
            .then(async data => {
                const pgn = await data.text();
            });
    }
}


function processPGN(pgn){
    
}
