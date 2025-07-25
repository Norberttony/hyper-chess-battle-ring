
import pathModule from "node:path";
import fs from "node:fs";

import { logError } from "./logger.mjs";


export class FS_Obj {
    constructor(paths, type){
        this.path = pathModule.join(...paths);
        this.type = type;

        if (type != "dir" && type != "file")
            throw logError(`Invalid FS Obj type: ${this.type}`);
    }

    static inferType(paths){
        const path = pathModule.join(...paths);
        if (!fs.existsSync(path))
            throw logError(`FS_Obj: ${path} does not exist`);

        if (fs.statSync(path).isDirectory())
            return new Dir_Obj([ path ]);
        else
            return new File_Obj([ path ]);
    }

    init(){
        throw new Error("FS_Obj.init() not implemented");
    }

    exists(){
        return fs.existsSync(this.path);
    }

    getName(){
        return pathModule.basename(this.path);
    }
}

export class File_Obj extends FS_Obj {
    constructor(paths){
        super(paths, "file");
    }

    init(data = ""){
        if (this.exists())
            return;
        this.writeSync(data);
    }

    async read(){
        return new Promise((res, rej) => {
            fs.readFile(this.path, (err, data) => {
                if (err)
                    rej(err);
                else
                    res(data.toString());
            });
        });
    }

    readSync(){
        return fs.readFileSync(this.path).toString();
    }

    readJSON(){
        return JSON.parse(this.readSync());
    }

    write(data){
        return new Promise((res, rej) => {
            fs.writeFile(this.path, data, (err) => {
                if (err)
                    rej(err);
            });
        });
    }

    writeSync(data){
        return fs.writeFileSync(this.path, data);
    }

    save(data){
        fs.writeFileSync(this.path, data);
    }

    saveJSON(obj){
        this.save(JSON.stringify(obj));
    }

    appendSync(data){
        fs.appendFileSync(this.path, data);
    }
}

export class Dir_Obj extends FS_Obj {
    constructor(paths){
        super(paths, "dir");
    }

    init(){
        if (this.exists())
            return;
        fs.mkdirSync(this.path, data);
    }

    joinPath(relPath){
        return pathModule.join(this.path, relPath);
    }

    join(relPath){
        return FS_Obj.inferType([ this.path, relPath ]);
    }

    joinFile(relPath){
        return new File_Obj([ this.path, relPath ]);
    }

    contents(){
        const contents = [];
        const names = fs.readdirSync(this.path);
        for (const n of names){
            contents.push(FS_Obj.inferType([ this.path, n ]));
        }
        return contents;
    }
}
