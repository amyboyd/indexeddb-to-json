import {FastifyInstance, RouteOptions} from 'fastify';
import extract from '../cli/extract';
import {IndexedDBType} from '../types';

interface QueryString {
    directory: string;
    asType: IndexedDBType;
}

const queryStringSchema = {
    type: 'object',
    properties: {
        directory: {type: 'string'},
        asType: {type: 'string'},
    },
    required: ['directory', 'asType'],
    additionalProperties: false,
};

const route: RouteOptions = {
    method: 'GET',
    url: '/extract.json',
    schema: {
        querystring: queryStringSchema,
        response: {
            200: {
                type: 'object',
                properties: {
                    databases: {type: 'array'},
                },
            },
        },
    },
    async handler(request, reply) {
        const {directory, asType} = request.query as QueryString;

        const databases = await extract(directory, {return: true});

        switch (asType) {
            case 'Unknown':
                break;
            case 'Slack':
                // @todo - create special Slack view.
                break;
            case 'Teams':
                // @todo - create special Teams view.
                break;
            default:
                throw new Error('Unsupported type: ' + asType);
        }

        reply.send({databases});
    },
};

export default function register(server: FastifyInstance): void {
    server.route(route);
}
