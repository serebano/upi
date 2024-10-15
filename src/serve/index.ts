import { getEnv, type ServeOptions } from '../mod.ts'

export type Server =
    | import('./node.ts').NodeServer
    | import('./deno.ts').DenoServer
    | import('./bun.ts').BunServer

/**
 * Serves the UPI based on the environment.
 *
 * Depending on the environment, this function dynamically imports and starts the appropriate server.
 *
 * @param {ServeOptions} options - The options to configure the server.
 * @returns {Promise<Server>} 
 * A promise that resolves to the server instance for the current environment.
 * @throws {Error} If the environment is unknown.
 */
export async function serve(options: ServeOptions): Promise<Server> {
    const env = getEnv()

    if (!['node', 'deno', 'bun'].includes(env))
        throw new Error('Unknown environment')

    return import(`./${env}.ts`).then(mod => mod.serve(options))
}