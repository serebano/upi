import { createServer } from 'http'
import { createServerAdapter } from '@whatwg-node/server'
import { createRequestHandler } from './serve'

const PORT = 4001
const API_DIR = import.meta.resolve('./')

export type RAPIServeOptions = {
    port: number,
    apiDir: string
}

export async function serve(options: RAPIServeOptions) {
    options = options || {}
    options.port = options.port || PORT
    options.apiDir = options.apiDir || API_DIR

    const requestHandler = createRequestHandler(options.apiDir, { readFile })
    const nodeRequestHandler = createServerAdapter(requestHandler)
    const server = createServer(nodeRequestHandler)

    server.on('listening', () => console.log('(Node) Server listening', {
        port: options.port,
        apiDir: options.apiDir,
        endpoint: `http://localhost:${options.port}`
    }))

    server.on('close', () => console.log('(Node) Server closed'))
    server.on('error', (error) => console.error('(Node) Server error:', error))

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
            autoClose: true
        })) as unknown as ReadableStream

    } catch (error: any) {
        throw error
    }
}