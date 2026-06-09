import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.api.port, env.api.host, () => {
    console.log(`Server running at http://${env.api.host}:${env.api.port}`);
});
