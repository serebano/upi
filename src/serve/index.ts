import { getEnv, type UPIServeOptions } from '../mod.ts'

export type UPIServer =
    | import('./node.ts').NodeServer
    | import('./deno.ts').DenoServer
    | import('./bun.ts').BunServer

/**
 * Serves the UPI based on the environment.
 *
 * Depending on the environment, this function dynamically imports and starts the appropriate server.
 *
 * @param {UPIServeOptions} options - The options to configure the server.
 * @returns {Promise<UPIServer>} 
 * A promise that resolves to the server instance for the current environment.
 * @throws {Error} If the environment is unknown.
 */
export async function serve(options: UPIServeOptions): Promise<UPIServer> {
    switch (getEnv()) {
        case 'node':
            return import('./node.ts').then(({ serve }) => serve(options))
        case 'deno':
            return import('./deno.ts').then(({ serve }) => serve(options))
        case 'bun':
            return import('./bun.ts').then(({ serve }) => serve(options))
        default:
            throw new Error('Unknown environment')
    }
}