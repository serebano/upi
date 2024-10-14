import { serve } from "./serve/index.ts";

await serve({
    port: 4001,
    apiDir: import.meta.dirname
});