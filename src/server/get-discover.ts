import {FastifyInstance, RouteOptions} from 'fastify';
import discover from '../cli/discover';
import {IndexedDBRoot} from '../types';

const route: RouteOptions = {
    method: 'GET',
    url: '/discover.json',
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    indexedDbRoots: {type: 'array'},
                },
            },
        },
    },
    handler: async (_request, reply) => {
        const indexedDbRoots = (await discover({return: true})) as IndexedDBRoot[];
        reply.send({indexedDbRoots});
    },
};

export default function register(server: FastifyInstance): void {
    server.route(route);
}
