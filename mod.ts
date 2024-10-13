/**
 * RAPI - Remote Application Programming Interface
 * 
 * @description  This module provides a framework for handling API requests and responses in a dynamic and flexible manner.
 *               It includes interfaces for defining API requests and responses, utility functions for error handling,
 *               and a mechanism for creating API proxies that can dynamically invoke methods on a remote target.
 * 
 * @module rapi
 * 
 * @example
 * ```typescript
 * import rapi from 'rapi';
 * 
 * const api = rapi('http://example.com/api');
 * const result = await api.someMethod('arg1', 'arg2');
 * ```
 * 
 * @example
 * ```typescript
 * import rapi from 'rapi';
 * 
 * const api = rapi('file://./myModule.ts');
 * const result = await api.someMethod('arg1', 'arg2');
 * ```
 */

export const RAPI_ID_HEADER = 'X-RAPI-ID';
export const RAPI_USER_AGENT = 'RAPI/1.0';

export default rapi;

/**
 * Creates a proxy for a given URL input based on its protocol.
 * 
 * @param {string | URL} input - The input URL or string to create a proxy for.
 * @returns A proxy object with handlers based on the URL protocol.
 * 
 * @throws {Error} - Throws an error if the protocol is unsupported.
 * 
 * Supported protocols:
 * - 'http:'
 * - 'https:'
 * - 'file:'
 */

export function rapi<T extends RAPITarget>(input: string | URL) {
    const url = new URL(input)

    switch (url.protocol) {
        case 'http:':
        case 'https:':
            return proxy<T>(Object.create(null), createFetchHandler(url))

        case 'file:':
            return proxy<T>(Object.create(null), createLocalHandler(url))

        default:
            throw new Error(`Unsupported protocol: ${url.protocol}`)
    }
}

/**
 * Creates a local handler function that dynamically imports a module based on the provided input
 * and processes a request using the imported module.
 *
 * @param input - A string or URL that specifies the path to the module to be imported.
 * @returns A function that takes a context and a request, imports the specified module,
 *          and handles the request using the imported module.
 */
export function createLocalHandler(input: string | URL): RAPIHandler {
    return async function localHandler(_, request) {
        const url = import.meta.resolve(String(input))
        const mod = await import(url)
        const res = await handle(mod, request)

        return res
    }
}


/**
 * Creates a fetch handler function that sends a POST request to the specified input URL.
 *
 * @param input - The URL or string to which the POST request will be sent.
 * @returns A function that handles the fetch request and returns the JSON response.
 *
 * @throws Will throw an error if the fetch request fails or if the response contains an invalid RAPI ID header.
 */
export function createFetchHandler(input: string | URL): RAPIHandler {
    return async function fetchHandler(_, request) {
        const response = await fetch(input, {
            method: 'POST',
            headers: {
                'User-Agent': RAPI_USER_AGENT,
                'Content-Type': 'application/json',
                RAPI_ID_HEADER: request.id,
            },
            body: JSON.stringify({
                path: request.path,
                args: request.args,
            })
        })

        if (!response.ok)
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);

        if (response.headers.get(RAPI_ID_HEADER) !== request.id)
            throw new Error(`Invalid response: ${response.status}} { req=${request.id}, res=${response.headers.get(RAPI_ID_HEADER)} }`);

        return await response.json()
    }
}

/**
 * Creates an API proxy for the given target and handler.
 *
 * @template T - The type of the API target.
 * @param {T} target - The API target object to be proxied.
 * @param {RAPIHandler} handler - The handler function that processes API requests.
 * @returns {T} - A proxied version of the target object.
 *
 * @throws {UndefinedNotAllowedError} - If any of the arguments passed to the proxied function are `undefined`.
 *
 * @example
 * ```typescript
 * const api = createAPI(myTarget, myHandler);
 * const result = await api.someMethod('arg1', 'arg2');
 * ```
 */
export function proxy<T extends RAPITarget>(target: T, handler: RAPIHandler): T {

    function createProxyHandler(path: string[]): ProxyHandler<any> {
        const proxyHandler: ProxyHandler<any> = {
            apply: (target, thisArg, argArray) => Reflect.apply(target, thisArg, argArray),
            get(_, prop: string) {
                path = [...path, prop];
                return new Proxy(async (...args: any[]): Promise<any> => {
                    if (args.includes(undefined))
                        throw new UndefinedNotAllowedError(`${prop}: undefined not allowed, use null instead`);

                    const req: RAPIRequest = { id: uid(), path, args };
                    const res: RAPIResponse = await handler(target, req);

                    if (res.error)
                        throw stringToError(res.error);

                    return res.result;
                }, createProxyHandler(path));
            }
            // TODO: Add support for setting properties on the target object.
        };

        return proxyHandler;
    }

    return new Proxy(target, createProxyHandler([])) as T;
}

/**
 * Handles API requests by dynamically invoking the specified method on the target object.
 *
 * @param target - The target object on which the method is to be invoked.
 * @param request - The API request containing the path to the method and the arguments to be passed.
 * @returns A promise that resolves to an API response containing either the result of the method invocation or an error message.
 *
 * @throws Will return an error response if the specified method is not found on the target object.
 */
export async function handle(target: RAPITarget, request: RAPIRequest): Promise<RAPIResponse> {
    const path = [...request.path || []];
    const prop = path.pop();
    const func = (prop
        ? (target = get(target, path))[prop]
        : undefined) as undefined | ((...args: any[]) => any)

    if (func === undefined) {
        return {
            id: request.id,
            path: request.path,
            error: errorToString(new Error(`Unknown request "${path.join('.')}:${prop}". \nValid = ${Object.keys(target)}`)),
        };
    }

    try {
        return {
            id: request.id,
            path: request.path,
            result: await func.apply(target, request.args),
        }
    } catch (error: any) {
        return {
            id: request.id,
            path: request.path,
            error: errorToString(error),
        };
    }
}






/**
 * RAPI Utils
 */


function getDetails(target: any) {
    return {
        ownKeys: Reflect.ownKeys(target),
        getPrototypeOf: Reflect.getPrototypeOf(target),
        getOwnPropertyDescriptors: Reflect.ownKeys(target).reduce((acc: any, key: any) => {
            acc[key] = Reflect.getOwnPropertyDescriptor(target, key);
            return acc;
        }, Object.create(null)),
    }
}

/**
 * Represents an error where `undefined` is not allowed.
 */
export class UndefinedNotAllowedError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'UndefinedNotAllowed';
    }
}

export const ERROR_CLASSES: any[] = [
    EvalError,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
    URIError,
];

const randInt = (lo: number, hi: number): number => lo + Math.floor(Math.random() * (hi - lo));
export const uid = (): string => ('' + randInt(0, 999999999999999)).padStart(15, '0');

export function get(obj: any, path: string | string[]): any {
    return (Array.isArray(path) ? path : path.split('.'))
        .reduce((currentObject, key) => currentObject ? currentObject[key] : undefined, obj);
}

/**
 * Converts an error to a string representation.
 *
 * @param error - The error to be converted.
 * @returns The string representation of the error.
 */
export function errorToString(error: Error): string {
    if (error.message) {
        return `${error.name}: ${error.message}\n${error.stack}`;
    } else {
        return error.name;
    }
}

/**
 * Converts a string representation of an error to an Error object.
 *
 * @param s - The string representation of the error.
 * @returns The Error object.
 */
export function stringToError(s: string): Error {
    let [nameMessage, ...stack] = s.split('\n');
    let [name, message] = nameMessage.split(': ');
    let error = new Error();
    let matched = false;
    for (let errorClass of ERROR_CLASSES) {
        if (errorClass.name === name) {
            matched = true;
            error = new errorClass();
            break;
        }
    }

    error.name = name;

    if (message) {
        error.message = message;
    }

    if (stack.length) {
        error.stack = stack.join('\n');
    }

    return error;
}


/**
 * ----------------------------------------------------------------------------
 * RAPI Types
 */

/**
 * Represents an API request.
 * 
 * @interface RAPIRequest
 * @property {string} id - The unique identifier for the API request.
 * @property {string[]} path - The path segments of the API endpoint.
 * @property {any[]} args - The arguments to be passed with the API request.
 */
export interface RAPIRequest {
    id: string
    path: string[]
    args: any[]
}

/**
 * Represents the response from an API call.
 * 
 * @interface RAPIResponse
 * @property {string} id - The unique identifier for the API response.
 * @property {string[]} path - The path segments of the API endpoint.
 * @property {any} [result] - The result of the API call, if successful.
 * @property {string} [error] - The error message, if the API call failed.
 */
export interface RAPIResponse {
    id: string
    path: string[]
    result?: any
    error?: string
}

/**
 * Represents a target for an API call.
 * 
 * @property {string} key - The key representing the target.
 * @property {any} value - The value associated with the key.
 */
export type RAPITarget = Record<string, any>;

/**
 * Represents a handler function for API requests.
 *
 * @param target - The target of the API request.
 * @param request - The API request object.
 * @returns A promise that resolves to an API response.
 */
export type RAPIHandler = (target: RAPITarget, request: RAPIRequest) => Promise<RAPIResponse>;