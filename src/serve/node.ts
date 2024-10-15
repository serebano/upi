// import { createServer } from 'node:http'
// import { createServerAdapter } from '@whatwg-node/server'
import { createRequestHandler, type ServeOptions } from '../mod.ts'
import type { Server } from 'node:http'

export type NodeServeOptions = {
    port: number,
    fetch: (request: Request) => Promise<Response> | Response,
    onListening?: (addr: { port: number, address: string }) => void,
    onError?: (error: Error) => void
}

export type NodeServer = Server

const Node = {
    async serve(options: NodeServeOptions): Promise<NodeServer> {
        const { createServer } = await import('node:http')
        const { createServerAdapter } = await import('@whatwg-node/server')

        const nodeRequestHandler = createServerAdapter(options.fetch)
        const server = createServer(nodeRequestHandler)

        server.on('error', (err) => options.onError?.(err))
        server.on('listening', () => {
            options.onListening?.(server.address() as { port: number, address: string })
        })

        return server.listen(options.port)
    }

}
export function serve(options: ServeOptions): Promise<NodeServer> {
    const requestHandler = createRequestHandler(options.apiDir, { readFile, readDir })

    return Node.serve({
        port: options.port,
        fetch: requestHandler,
        onListening: (addr) => {
            console.log('(upi/node) serving:', {
                apiDir: options.apiDir,
                endpoint: `http://${addr.address}:${addr.port}`
            })
        }
    })
}

export async function readFile(filePath: string): Promise<ReadableStream> {
    try {
        const fs = await import('node:fs')
        const { Readable } = await import('node:stream')

        filePath = filePath.startsWith('file://') ? filePath.slice(7) : filePath

        if (!fs.existsSync(filePath))
            throw new Error(`Module not found: ${filePath}`)

        return Readable.toWeb(fs.createReadStream(filePath, {
            autoClose: true,
        })) as unknown as ReadableStream

    } catch (error: any) {
        throw error
    }
}

export async function readDir(dirPath: string): Promise<string[]> {
    const fs = await import('node:fs/promises');
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    return entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name);
}