import fastify from 'fastify';
import getDiscover from '../server/get-discover';

interface CommandOptions {
    port: string;
}

export default async function command(options: CommandOptions): Promise<void> {
    const host = '127.0.0.1';
    const port = Number(options.port);

    const server = await fastify({
        logger: true,
    });

    getDiscover(server);

    await server.listen({host, port});
    console.log(`Listening on http://${host}:${port}`);
}
