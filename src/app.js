import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static'; // новый импорт
import 'dotenv/config';
import { config } from './config/index.js';
import uploadRoutes from './routes/upload.js';
import processRoutes from './routes/process.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({ logger: true });

await fastify.register(multipart);
await fastify.register(uploadRoutes);
await fastify.register(processRoutes);

// Раздача статических файлов из папки public
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
});

fastify.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

const start = async () => {
  try {
    await fastify.listen({ port: config.app.port });
    console.log(`Server running on http://localhost:${config.app.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();