import { createServer, type Server } from 'node:http'
import { createServerAdapter } from '@whatwg-node/server'
import { createRequestHandler, type UPIServeOptions } from '../mod.ts'

export type NodeServer = Server

export function serve(options: UPIServeOptions): NodeServer {
    const requestHandler = createRequestHandler(options.apiDir, { readFile, readDir })
    const nodeRequestHandler = createServerAdapter(requestHandler)
    const server = createServer(nodeRequestHandler)

    server.on('listening', () => {
        console.log('(upi/node) serving:', {
            apiDir: options.apiDir,
            endpoint: `http://localhost:${options.port}`
        })
    })

    return server.listen(options.port)
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