import {FastifyInstance, RouteOptions} from 'fastify';
import discover from '../cli/discover';

const route: RouteOptions = {
    method: 'GET',
    url: '/discover.json',
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    databases: {type: 'array'},
                },
            },
        },
    },
    handler: async (_request, reply) => {
        const databases = await discover({return: true});
        reply.send({databases});
    },
};

export default function register(server: FastifyInstance): void {
    server.route(route);
}
