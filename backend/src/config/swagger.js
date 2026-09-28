import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GuardMee API',
      version: '1.0.0',
      description: 'API REST pour la plateforme GuardMee - Signalement et alertes au Cameroun',
      contact: { name: 'GuardMee', email: 'contact@guardmee.cm' },
    },
    servers: [{ url: 'http://localhost:5000', description: 'Développement' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentification et gestion de compte' },
      { name: 'Incidents', description: 'Signalements d\'incidents' },
      { name: 'Moderation', description: 'Modération des signalements' },
      { name: 'Alerts', description: 'Alertes géolocalisées' },
      { name: 'Resources', description: 'Ressources d\'urgence' },
      { name: 'Notifications', description: 'Notifications utilisateur' },
      { name: 'Admin', description: 'Administration' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
