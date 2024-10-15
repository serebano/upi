// import { serve } from "./serve/index.ts";

import { getEnv } from "./mod.ts";

console.log('env', getEnv())
console.log('serve', import.meta.resolve("./serve/index.ts"))



await import("./serve/index.ts")
    .then(({ serve }) => serve({
        port: 3030,
        apiDir: import.meta.dirname + '/test'
    }));

// await serve({
//     port: 3030,
//     apiDir: import.meta.dirname + '/test'
// });