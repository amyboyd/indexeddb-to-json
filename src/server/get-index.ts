import {FastifyInstance} from 'fastify';
import {promises as fsPromises} from 'fs';

export default function register(server: FastifyInstance): void {
    server.get('/', async (_request, reply) => {
        const html = await fsPromises.readFile(__dirname + '/static/index.html', 'utf8');
        reply.type('text/html').send(html);
    });
}
