// This file handles communicating with the database

import https from "https";
import fs from "fs";
import dotenv from "dotenv";

import { Board } from "../viewer/scripts/game/game.mjs";
import { getMoveSAN } from "../viewer/scripts/game/san.mjs";
import { Piece } from "../viewer/scripts/game/piece.mjs";


dotenv.config();

export function createTable(tableName, columns){
    return pollDatabase("POST", {
        cmd: "table",
        table: tableName,
        columns
    });
}

export function getRowByNum(tableName, rowNum){
    return pollDatabase("GET", {
        cmd: "row",
        table: tableName,
        rowNum
    });
}

export function addRowByValues(tableName, rowValues){
    return pollDatabase("POST", {
        cmd: "rowValues",
        table: tableName,
        values: rowValues
    });
}

export function fastAddRowByValues(tableName, rowValues){
    return pollDatabase("POST", {
        cmd: "fastRowValues",
        table: tableName,
        values: rowValues
    });
}


const DB_URL = `https://script.google.com/macros/s/${process.env.DB_ID}/exec`;

export function pollDatabase(method, params){
    const urlParams = new URLSearchParams(params);
    const url = `${DB_URL}?${urlParams}`;

    return new Promise((res, rej) => {

        const start = new Date();

        function sendSignal(){
            try {
                httpRequest(method, url, (data) => {

                    const end = new Date();
                    console.log(end - start);
                    res(data);

                }, rej);
            }
            catch(err){
                setTimeout(sendSignal, 1000);
            }
        }

        sendSignal();

    });
}

export function sleep(amt){
    return new Promise((res, rej) => {
        setTimeout(() => {
            res();
        }, amt);
    });
}

// Courtesy of https://stackoverflow.com/questions/3710204
export function isJSON(str){
    try {
        const o = JSON.parse(str);

        return o && typeof o == "object";
    }
    catch(err){}
    return false;
}

const memoryBank = {};
function httpRequest(method, url, resolve, reject){
    if (url == undefined){
        resolve({ status: "err", msg: "URL is undefined" });
        return;
    }
    let resolved = false;

    const req = https.request(url, { method }, (res) => {

        res.on("data", (event) => {
            if (resolved)
                return;

            if (res.headers.location){
                resolved = true;
                return httpRequest("GET", res.headers.location, resolve, reject);
            }

            const data = event.toString();
            if (data[0] == "<"){
                // try again...
                return httpRequest("GET", res.headers.location, resolve, reject);
            }else if (data == "none"){
                resolve({});
            }else if (!isJSON(data)){
                const attempt2 = (memoryBank[url] || "") + data;
                if (!isJSON(attempt2)){
                    memoryBank[url] = attempt2;
                    return;
                }else{
                    resolve(JSON.parse(attempt2));
                }
            }else{
                resolve(JSON.parse(data));
            }
            resolved = true;
        });

    });

    req.on("error", (err) => {
        setTimeout(() => {
            httpRequest("GET", url, resolve, reject);
        }, 1000);
    });

    req.end();
}

const tables = {};

export async function exportGame(gameData){
    const white = gameData.white.name;
    const black = gameData.black.name;
    
    // create table if necessary
    const sortedNames = [ white, black ].sort();
    const tblName = `${sortedNames[0]}_${sortedNames[1]}`;

    if (!tables[tblName]){
        tables[tblName] = createTable(tblName, [ "ID", "FEN", "White", "Black", "Result", "Plies", "# Legal Moves", "# 1 Piece Captures", "# 2 Piece Captures", "# 3 Piece Captures", "# 4 Piece Captures", "# 5 Piece Captures", "End Piece Count", "Constellation Index", "Constellations", "Moves" ]);
    }

    await tables[tblName];

    const FEN = lines[0].replace("FEN: ", "");

    // move counts indexed by # of captured pieces
    let moveCounts = [ 0, 0, 0, 0, 0, 0 ];

    let moves = "";
    let constellations;
    let noCapturesTime = 0;
    let madeMoves = 0;

    const brd = new Board();
    brd.loadFEN(FEN);
    for (let i = 3; i < lines.length - 1; i++){
        if (m.captures.length > 0)
            noCapturesTime = 0;
        else
            noCapturesTime++;

        if (noCapturesTime == 5){
            let pieceCounts = [ [ 0, 0, 0, 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0, 0, 0, 0 ] ];
            for (const p of brd.squares){
                if (p){
                    const col = Piece.getColor(p) == Piece.white ? 0 : 1;
                    const typ = Piece.getType(p);
                    pieceCounts[col][typ]++;
                }
            }

            if (constellations)
                constellations += " p";
            else
                constellations = "p";

            for (let i = Piece.retractor; i <= Piece.immobilizer; i++){
                constellations += pieceCounts[0][i];
                constellations += pieceCounts[1][i];
            }
        }
    }

    let result = lines[lines.length - 1];
    if (brd.isGameOver() && brd.result == "#"){
        if (brd.turn == Piece.black)
            result = 1;
        else
            result = -1
    }

    let endPieceCount = 0;
    let pieceCounts = [ [ 0, 0, 0, 0, 0, 0, 0, 0 ], [ 0, 0, 0, 0, 0, 0, 0, 0 ] ];
    for (const p of brd.squares){
        if (p){
            const col = Piece.getColor(p) == Piece.white ? 0 : 1;
            const typ = Piece.getType(p);
            endPieceCount++;
            pieceCounts[col][typ]++;
        }
    }

    let constellationIdx = "p";
    for (let i = Piece.retractor; i <= Piece.immobilizer; i++){
        constellationIdx += pieceCounts[0][i];
        constellationIdx += pieceCounts[1][i];
    }

    console.log(await fastAddRowByValues(tblName, [ id, FEN, white, black, result, madeMoves, ...moveCounts, endPieceCount, constellationIdx, constellations, moves ]));

    return true;
}
