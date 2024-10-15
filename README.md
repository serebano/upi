# upi

Universal Programming Interface

```ts
// api/index.ts
export const sayHi = (name: string) => `Hi ${name}`;
```

```ts
import * as myApi from 'http://localhost:3030'

awit myApi.sayHi()
```

```ts
import { serve } from "@serebano/upi/serve";

await serve({
    port: 8077,
    apiDir: import.meta.dirname,
});
```
