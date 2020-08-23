import fastify from 'fastify';
import {globPromise} from './utils';

interface CommandOptions {
    port: string;
}

export default async function command(options: CommandOptions): Promise<void> {
    const host = '127.0.0.1';
    const port = Number(options.port);

    const server = await fastify({
        logger: true,
    });

    const endpoints = await globPromise(__dirname + '/../server/*.ts', {});
    endpoints.forEach((endpoint) => {
        require(endpoint).default(server);
    });

    await server.listen({host, port});
    console.log(`Listening on http://${host}:${port}`);
    console.log('Endpoints:');
    console.log(server.printRoutes());
}
