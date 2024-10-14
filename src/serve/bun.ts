import type { Server } from "bun";
import { createRequestHandler } from "../mod.ts";
import type { UPIServeOptions } from "../mod.ts";

export type BunServer = Server

export function serve(options: UPIServeOptions): BunServer {
    const server = Bun.serve({
        port: options.port,
        fetch: createRequestHandler(options.apiDir, { readFile })
    })

    console.log('(upi/bun) serving:', {
        apiDir: options.apiDir,
        endpoint: `http://localhost:${options.port}`
    })

    return server
}

export function readFile(filePath: string): ReadableStream<Uint8Array> {
    return Bun.file(filePath).stream()
}

export async function readDir(dirPath: string): Promise<string[]> {
    const fs = await import('node:fs/promises');
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
}