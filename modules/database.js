// This file handles communicating with the database

const https = require("https");


function createTable(tableName, columns){
    return pollDatabase("POST", {
        cmd: "table",
        table: tableName,
        columns
    });
}

function getRowByNum(tableName, rowNum){
    return pollDatabase("GET", {
        cmd: "row",
        table: tableName,
        rowNum
    });
}

function addRowByValues(tableName, rowValues){
    return pollDatabase("POST", {
        cmd: "rowValues",
        table: tableName,
        values: rowValues
    });
}

function fastAddRowByValues(tableName, rowValues){
    return pollDatabase("POST", {
        cmd: "fastRowValues",
        table: tableName,
        values: rowValues
    });
}


const DB_URL = `https://script.google.com/macros/s/${process.env.DB_ID}/exec`;

function pollDatabase(method, params){
    const urlParams = new URLSearchParams(params);
    const url = `${DB_URL}?${urlParams}`;

    return new Promise((res, rej) => {

        const start = new Date();

        function sendSignal(){
            try {
                console.log(method, params);
                httpRequest(method, url, (data) => {

                    const end = new Date();
                    console.log(end - start);
                    res(data);

                }, rej);
            }
            catch(err){
                console.error(err);
                console.log("Retrying to connect...");
                setTimeout(sendSignal, 1000);
            }
        }

        sendSignal();

    });
}

function sleep(amt){
    return new Promise((res, rej) => {
        setTimeout(() => {
            res();
        }, amt);
    });
}

// Courtesy of https://stackoverflow.com/questions/3710204
function isJSON(str){
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
                console.error(data);
                console.error(method, url);

                // try again...
                return httpRequest("GET", res.headers.location, resolve, reject);
            }else if (data == "none"){
                console.log("WHAT? NONE?", url);
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
        console.log("Got a request error", method, url);
        console.error(err);
        setTimeout(() => {
            httpRequest_helper("GET", url, resolve, reject);
        }, 1000);
    });

    req.end();
}

module.exports = { pollDatabase, getRowByNum, addRowByValues, fastAddRowByValues, createTable };
