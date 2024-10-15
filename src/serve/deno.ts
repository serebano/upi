import { createRequestHandler } from "../mod.ts";
import type { ServeOptions } from "../mod.ts";

export type DenoServer = Deno.HttpServer<Deno.NetAddr>

export function serve(options: ServeOptions): DenoServer {
    return Deno.serve({
        port: options.port,
        handler: createRequestHandler(options.apiDir, { readFile, readDir }),
        onListen: () => {
            console.log('(upi/deno) serving:', {
                apiDir: options.apiDir,
                endpoint: `http://localhost:${options.port}`
            })
        }
    })
}

export function readFile(filePath: string): Promise<Uint8Array> {
    return Deno.readFile(filePath)
}

export function readDir(dirPath: string): Promise<string[]> {
    return Array.fromAsync(Deno.readDir(dirPath)).then(dirs => dirs.filter(dir => dir.isFile).map(dir => dir.name))
}