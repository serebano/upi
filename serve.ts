import { handle, RAPI_ID_HEADER, type RAPIRequest } from './rapi.ts'

export const PATH = import.meta.resolve('./')
export const PORT = 4000

export type RequestHandlerContext = {
    readFile: (path: string) => Promise<ReadableStream>,
    writeFile?: (path: string, content: string) => Promise<void>
}

const apiDefault: RequestHandlerContext = {
    readFile: async (path: string) => { throw new Error(`readFile not implemented: ${path}`) },
    writeFile: async (path: string, content: string) => { throw new Error(`writeFile not implemented: ${path}`) }
}

export function createRequestHandler(PATH: string, ctx: RequestHandlerContext) {
    ctx = { ...apiDefault, ...ctx }

    return async function handler(request: Request) {
        const url = new URL(request.url)
        const modPath = [PATH, url.pathname].join('')
        const resolvedModPath = import.meta.resolve(modPath)

        console.log(`[${request.method}]`, [request.url, modPath, resolvedModPath])

        if (request.method === 'POST') {
            const req = await request.json() as RAPIRequest
            const mod = await import(modPath)
            const res = await handle(mod, req)

            console.log('(POST)', { req, mod, res })

            return Response.json(res, {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    [RAPI_ID_HEADER]: request.headers.get(RAPI_ID_HEADER) || ''
                }
            })
        }

        if (request.method === 'GET') {
            console.log('(GET)', modPath)

            try {
                // modPath = modPath.replace('.appi.ts', '.ts')
                // const modUrl = `..${url.pathname.replace('.appi.ts', '.ts')}`

                const mod = await import(modPath)
                // const keys = Object.keys(mod).filter(key => key !== 'default')
                // console.log('(.ts module keys)', keys)

                function modTemplate(mod: any) {
                    const modUrl = `..${url.pathname.replace('.appi.ts', '.ts')}`
                    const keys = Object.keys(mod).filter(key => key !== 'default')
                    const template = `
                        import rapi from "../lib/rapi/rapi.ts";

                        const mod = rapi<typeof import('${modUrl}')>(import.meta.resolve('${modUrl}'))

                        export const { ${keys.join(', ')} } = mod
                        export default ${mod.default ? 'mod.default' : `mod`}`;

                    return template.split('\n').map(line => line.trim()).join('\n')
                }

                const module = url.pathname.endsWith('.mod.ts')
                    ? await ctx.readFile(modPath.replace('.mod.ts', '.ts'))
                    : modTemplate(mod)

                return new Response(module, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/typescript',
                        [RAPI_ID_HEADER]: request.headers.get(RAPI_ID_HEADER) || ''
                    }
                })
            } catch (error: any) {
                return Response.json({ error: error.message, modPath }, { status: 500 })
            }
        }

        if (url.pathname === '/rapi.ts' || url.pathname === '/rapi.js') {
            const ext = url.pathname.endsWith('.ts') ? '.ts' : '.js'
            const contentType = ext === '.ts' ? 'application/typescript' : 'application/javascript'
            const filePath = [import.meta.dirname, url.pathname.slice(1)].join('/')

            return new Response(await ctx.readFile(filePath), {
                status: 200,
                headers: {
                    'Content-Type': contentType,
                    [RAPI_ID_HEADER]: request.headers.get(RAPI_ID_HEADER) || ''
                }
            })

        }


        return new Response(`(rapi)`, { status: 200 })
    }
}