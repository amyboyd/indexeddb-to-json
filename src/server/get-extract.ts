import {FastifyInstance, FastifyRequest, RouteOptions} from 'fastify';
import extract from '../cli/extract';
import {DatabaseType} from '../cli/discover';

interface QueryString {
    directory: string;
    asType: DatabaseType;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Request = Omit<FastifyRequest, 'query'> & {query: QueryString | any};

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
    async handler(request: Request, reply) {
        const directory: string = request.query.directory;
        const databases = await extract(directory, {return: true});
        reply.send({databases});
    },
};

export default function register(server: FastifyInstance): void {
    server.route(route);
}
