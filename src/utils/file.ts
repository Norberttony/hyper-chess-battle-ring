import fs, { PathLike } from "node:fs";
import path from "node:path";

// Utilities for managing files

export interface DirStructure {
    [k: string]: DirStructure | string;
}

export function isDirectory(path: PathLike): boolean {
    return fs.lstatSync(path).isDirectory();
}

export async function moveFile(oldPath: PathLike, newPath: PathLike): Promise<void> {
    return new Promise((res, rej) => {
        fs.rename(oldPath, newPath, (err) => {
            if (err)
                rej(err);
            res();
        });
    });
}

// structure is an object with keys being name of a directory or file. If the key is a directory
// name, its value is another object (the same as a structure). If the key is a file, the value is
// the contents of that file. These files are only initialized if they did not exist beforehand!
export async function buildStructure(structure: DirStructure, root: string = "."): Promise<void> {
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

// reads all of the files given and returns a list of content from each of those files.
// if a read fails, returns undefined for that file.
export async function readFiles(...paths: PathLike[]): Promise<string[]> {
    const promises: Promise<string>[] = [];
    for (const p of paths){
        promises.push(new Promise((res, rej) => {
            fs.readFile(p, (err, data) => {
                if (err){
                    console.error(err);
                    rej(err);
                    return;
                }
                res(data.toString());
            })
        }));
    }

    const settled = await Promise.allSettled(promises);

    const content: string[] = [];
    for (const promise of settled){
        if (promise.status == "fulfilled")
            content.push(promise.value);
        else
            content.push("");
    }

    return content;
}
