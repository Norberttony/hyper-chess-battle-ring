
// Utilities for managing files

import fs from "node:fs";
import path from "node:path";

export function isDirectory(path){
    return fs.lstatSync(path).isDirectory();
}

export async function moveFile(oldPath, newPath){
    return new Promise((res, rej) => {
        fs.rename(oldPath, newPath, (err) => {
            if (err)
                throw err;
            res();
        });
    });
}

// structure is an object with keys being name of a directory or file. If the key is a directory
// name, its value is another object (the same as a structure). If the key is a file, the value is
// the contents of that file. These files are only initialized if they did not exist beforehand!
export async function buildStructure(structure, root = "."){
    for (const [ k, v ] of Object.entries(structure)){
        const p = path.join(root, k);
        if (typeof v === "object"){
            // directory
            if (!fs.existsSync(p))
                fs.mkdirSync(p);
            buildStructure(v, p);
        }else if (!fs.existsSync(p)){
            // nonexistent file
            fs.writeFileSync(p, v);
        }
    }
}
