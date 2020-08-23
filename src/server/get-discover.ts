import {FastifyInstance} from 'fastify';
import discover from '../cli/discover';

const opts = {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    dirs: {type: 'array'},
                },
            },
        },
    },
};

export default function register(server: FastifyInstance): void {
    server.get('/discover', opts, async (request, reply) => {
        reply.send({
            dirs: await discover({return: true}),
        });
    });
}
