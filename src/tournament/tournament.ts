import pathModule from "node:path";
import fs, { PathLike } from "node:fs";
import { extractHeaders, splitPGNs } from "hyper-chess-board/dist/pgn";
import { buildStructure, isDirectory, readFiles } from "../utils/file.js";
import { Pentamonial, pentaSPRT } from "../stats/penta-sprt.js";
import { testLLR } from "../stats/sprt.js";
import { convertGameDataToPGN, GameData } from "./game-data.js";
import { EngineProcess } from "./engine-process.js";
import { PGNHeaders } from "hyper-chess-board/dist/graphics/pgn/pgn-data.js";

// Directly deals with file management, player add/remove, results management, and logging to the
// terminal.

export type ResultSymbol = "1-0" | "1/2-1/2" | "0-1" | "*";

export type BotVsBotResult =  Pentamonial & { w: number, d: number, l: number };

export interface HalfResult {
    whiteName: string,
    blackName: string,
    result: ResultSymbol
}

export interface Bot {
    name: string,
    path: string
}

export interface ScheduledGame {
    white: Bot,
    black: Bot,
    fen: string,
    round: string
}

export interface TimeControl {
    time: number,
    inc: number
}

export interface ReadyGame {
    white: Bot,
    black: Bot,
    w?: EngineProcess,
    b?: EngineProcess,
    fen: string,
    round: string,
    timeControl: TimeControl,
    path: PathLike,
    wdbgPath: PathLike,
    bdbgPath: PathLike
}

export interface SprtConfig {
    h0: number,
    h1: number,
    alpha: number,
    beta: number
}

export interface TournamentConfig {
    timeControl: {
        time: number,
        inc: number
    },
    players: Bot[],
    sprt: SprtConfig
}

export interface TournamentData {
    rounds: number
}

const defaultConfig: TournamentConfig = {
    timeControl: { time: 8000, inc: 80 },
    players: [],
    sprt: { h0: 0, h1: 10, alpha: 0.05, beta: 0.05 }
};

const tournamentDefaultFileStructure = {
    debug: {},
    games: {
        "00_compiled_games.pgn": ""
    },
    "config.json": JSON.stringify(defaultConfig),
    "data.json": `{"rounds": 0}`,
    "schedule.json": "[]"
};

// path of the tournaments folder
const tRoot = pathModule.join(".", "data", "tournaments");
const globalPosPath = pathModule.join(".", "data", "positions.json");

export class Tournament {
    private root: string;
    private compiledPath: PathLike;

    private positions: string[];
    private config: TournamentConfig;
    private data: TournamentData;

    private results: Record<string, Record<string, BotVsBotResult>> = {};
    // specifically for keeping track of pentamonial
    private halfResults: Record<string, HalfResult> = {};

    constructor(private name: string){
        this.root = pathModule.join(tRoot, this.name);

        if (!fs.existsSync(this.root))
            fs.mkdirSync(this.root);
        buildStructure(tournamentDefaultFileStructure, this.root);

        // initialize positions.json if not there
        const posPath = pathModule.join(this.root, "positions.json");
        if (!fs.existsSync(posPath))
            fs.copyFileSync(globalPosPath, posPath);

        this.positions = this.readPositions();
        this.config = this.readConfig();
        this.data = this.readData();

        // read in the players
        for (const p of this.config.players)
            this.initPlayer(p);

        // read in the games from a file
        this.compiledPath = pathModule.join(this.root, "games", "00_compiled_games.pgn");
        const compiledGames = fs.readFileSync(this.compiledPath).toString();
        for (const pgn of splitPGNs(compiledGames))
            this.recordGame(pgn);
    }

    public static getTournamentNames(): string[] {
        const names = [];
        for (const name of fs.readdirSync(tRoot)){
            const path = pathModule.join(tRoot, name);
            if (isDirectory(path))
                names.push(name);
        }
        return names;
    }

    public get timeControl(){
        return this.config.timeControl;
    }

    public get players(){
        return this.config.players;
    }

    public get sprt(){
        return this.config.sprt;
    }

    public setTimeControl(time: number, inc: number): void {
        this.timeControl.time = time;
        this.timeControl.inc = inc;
        this.saveConfig();
    }

    public setSPRT(h0: number, h1: number, alpha: number, beta: number): void {
        this.sprt.h0 = h0;
        this.sprt.h1 = h1;
        this.sprt.alpha = alpha;
        this.sprt.beta = beta;
        this.saveConfig();
    }

    public getName(): string {
        return this.name;
    }

    public getGamePath(round: string): PathLike {
        return pathModule.join(this.root, "games", `${round}_game.pgn`);
    }

    public async getGame(round: string): Promise<string[]> {
        const gamePath = this.getGamePath(round);
        const wdbgPath = this.getDebugPath(round, true);
        const bdbgPath = this.getDebugPath(round, false);
        return readFiles(gamePath, wdbgPath, bdbgPath);
    }

    public getDebugPath(round: string, isWhite: boolean): PathLike {
        return pathModule.join(this.root, "debug", `${round}_${isWhite ? "white" : "black"}.txt`);
    }

    // to-do: this should probably be called "round uid" or just "game uid"
    public getNextRound(): number {
        const r = ++this.data.rounds;
        this.saveData();
        return r;
    }

    private readJSON(pathFromRoot: string): any {
        return JSON.parse(fs.readFileSync(pathModule.join(this.root, pathFromRoot)).toString());
    }

    public writeJSON(pathFromRoot: string, data: any): void {
        fs.writeFileSync(pathModule.join(this.root, pathFromRoot), JSON.stringify(data));
    }

    public readSchedule(): ScheduledGame[] {
        return this.readJSON("schedule.json");
    }

    public readPositions(): string[] {
        return this.readJSON("positions.json");
    }

    public readData(): TournamentData {
        return this.readJSON("data.json");
    }

    public readConfig(): TournamentConfig {
        return this.readJSON("config.json");
    }

    public writeSchedule(schedule: ScheduledGame[]): void {
        this.writeJSON("schedule.json", schedule);
    }

    public writePositions(positions: string[]): void {
        this.writeJSON("positions.json", positions);
    }

    public saveConfig(): void {
        this.writeJSON("config.json", this.config);
    }

    public saveData(): void {
        this.writeJSON("data.json", this.data);
    }

    public getPlayerNames(): string[] {
        const names = [];
        for (const { name } of this.players)
            names.push(name);
        return names;
    }

    // Adds a player to the set of existing players.
    public addPlayer(engine: Bot): void {
        // check if this player has already been added
        for (const { path } of this.players){
            if (path == engine.path)
                return;
        }

        this.players.push(engine);
        this.initPlayer(engine);
        this.saveConfig();
    }

    public removePlayerByName(name: string): void {
        for (let i = 0; i < this.players.length; i++){
            if (this.players[i].name == name){
                this.players.splice(i, 1);
                this.saveConfig();
                return;
            }
        }
    }

    // expects { name, path }
    // Initializes the player
    private initPlayer(engine: Bot): void {
        this.results[engine.name] = {};
    }

    public playedGame(gameData: GameData): void {
        this.record(gameData.white.name, gameData.black.name, gameData.fen, gameData.result.result);

        const pgn = convertGameDataToPGN(gameData);
        fs.appendFileSync(this.compiledPath, "\n" + pgn + "\n");
    }

    public getEntry(name: string, oppName: string): BotVsBotResult {
        let entry: BotVsBotResult = this.results[name][oppName];
        if (!entry){
            entry = { w: 0, d: 0, l: 0, ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
            this.results[name][oppName] = entry;
        }
        return entry;
    }

    public getWhiteScore(result: ResultSymbol): number {
        if (result == "1-0")
            return 1;
        else if (result == "1/2-1/2")
            return 0.5;
        else
            return 0;
    }

    public recordGame(pgn: string): void {
        const headers: PGNHeaders = extractHeaders(pgn);
        this.record(headers.White!, headers.Black!, headers.FEN!, headers.Result! as ResultSymbol);
    }

    private record(whiteName: string, blackName: string, fen: string, result: ResultSymbol){
        const entry: BotVsBotResult = this.getEntry(whiteName, blackName);
        const oppEntry: BotVsBotResult = this.getEntry(blackName, whiteName);

        const whitePoints = this.getWhiteScore(result);

        // WDL records
        if (whitePoints == 1){
            entry.w++;
            oppEntry.l++;
        }else if (whitePoints == 0.5){
            entry.d++;
            oppEntry.d++;
        }else if (whitePoints == 0){
            entry.l++;
            oppEntry.w++;
        }

        // pentamonial records, which are only supported via 2-player tournaments
        if (this.players.length == 2){
            const f = this.halfResults[fen];
            if (f && f.blackName == whiteName && f.whiteName == blackName){
                // same game but colors reversed, record into penta
                const whiteDblPoints = whitePoints + 1 - this.getWhiteScore(f.result);
                if (whiteDblPoints == 2){
                    entry.ww++;
                    oppEntry.ll++;
                }else if (whiteDblPoints == 1.5){
                    entry.wd++;
                    oppEntry.ld++;
                }else if (whiteDblPoints == 1){
                    entry.dd++;
                    oppEntry.dd++;
                }else if (whiteDblPoints == 0.5){
                    entry.ld++;
                    oppEntry.wd++;
                }else if (whiteDblPoints == 0){
                    entry.ll++;
                    oppEntry.ww++;
                }
                
                delete this.halfResults[fen];
            }else{
                this.halfResults[fen] = { whiteName, blackName, result };
            }
        }
    }

    public getScoreAgainst(name: string, oppName: string): number {
        const { w, d } = this.getEntry(name, oppName);
        return w + 0.5 * d;
    }

    // given the player name,
    // returns an object containing the score achieved by the player, and the maxScore the player
    // could have achieved: { score, maxScore }
    public getScore(name: string): { score: number, maxScore: number } {
        let score = 0;
        let maxScore = 0;
        for (const { w, d, l } of Object.values(this.results[name])){
            score += w + 0.5 * d;
            maxScore += w + d + l;
        }
        return { score, maxScore };
    }

    public getWDL(name: string): { w: number, d: number, l: number } {
        const r = { w: 0, d: 0, l: 0 };
        for (const { w, d, l } of Object.values(this.results[name])){
            r.w += w;
            r.d += d;
            r.l += l;
        }
        return r;
    }

    public getPenta(name: string): Pentamonial {
        const r: Pentamonial = { ww: 0, wd: 0, dd: 0, ld: 0, ll: 0 };
        for (const { ww, wd, dd, ld, ll } of Object.values(this.results[name])){
            r.ww += ww;
            r.wd += wd;
            r.dd += dd;
            r.ld += ld;
            r.ll += ll;
        }
        return r;
    }

    public getPentaLLR({ ww, wd, dd, ld, ll }: Pentamonial, elo0: number, elo1: number): number {
        return pentaSPRT({ ll, ld, dd, wd, ww }, elo0, elo1);
    }

    public logToTerminal(): void {
        const [ p1, p2 ] = this.players;
        console.log("\nSPRT Tournament");
        if (p1)
            console.log(`New version: ${p1.name}`);
        if (p2)
            console.log(`Old version: ${p2.name}`);
        if (!p1 && !p2)
            console.log("No engines added yet");
        console.log("");
        this.report();
        console.log("");
    }

    // logs a report to the terminal
    public report(): void {
        const [ p1, p2 ] = this.players;

        if (!p1 || !p2)
            return;

        const { h0, h1, alpha, beta } = this.sprt;
        const { ll, ld, dd, wd, ww, w, d, l } = this.getEntry(p1.name, p2.name);
        const llr = pentaSPRT({ ll, ld, dd, wd, ww }, h0, h1);
        const hyp = testLLR(llr, alpha, beta) || "inconclusive";

        console.log(`${w + d + l} games played`);
        console.log(`WDL ${w} - ${d} - ${l}`);
        console.log(`Penta (${ll}, ${ld}, ${dd}, ${wd}, ${ww})`);
        console.log(`LLR: ${llr.toFixed(5)} (${hyp})`);
    }
}
