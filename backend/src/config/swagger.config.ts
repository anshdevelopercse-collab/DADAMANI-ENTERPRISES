import swaggerJSDoc from 'swagger-jsdoc';
import { ENV } from './env.config.js';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Dada Mani Enterprise Operations Management System API',
    version: '1.0.0',
    description: 'Enterprise REST API specification for Logistics, Mining, Infrastructure, Fleet Management, Tenders, Work Orders, and Audit Logging.',
    contact: {
      name: 'Dada Mani Enterprise Operations Engineering',
      email: 'tech@dadamani.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${ENV.PORT}${ENV.API_PREFIX}`,
      description: 'Development API Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
