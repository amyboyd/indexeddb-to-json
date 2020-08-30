import {FastifyInstance, RouteOptions} from 'fastify';
import discover from '../cli/discover';
import {IndexedDBRoot} from '../types';

interface QueryString {
    includeDatabaseCounts?: boolean;
}

const queryStringSchema = {
    type: 'object',
    properties: {
        includeDatabaseCounts: {type: 'boolean'},
    },
    additionalProperties: false,
};

const route: RouteOptions = {
    method: 'GET',
    url: '/discover.json',
    schema: {
        querystring: queryStringSchema,
        response: {
            200: {
                type: 'object',
                properties: {
                    indexedDbRoots: {type: 'array'},
                },
            },
        },
    },
    handler: async (request, reply) => {
        const {includeDatabaseCounts} = request.query as QueryString;

        const indexedDbRoots = (await discover({
            return: true,
            includeDatabaseCounts,
        })) as IndexedDBRoot[];

        reply.send({indexedDbRoots});
    },
};

export default function register(server: FastifyInstance): void {
    server.route(route);
}
