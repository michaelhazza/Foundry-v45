import express from 'express';
import path from 'path';
import fs from 'fs';
import { corsMiddleware } from './middleware/cors.js';
import { config } from './lib/config.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import organisationRoutes from './routes/organisation.routes.js';
import usersRoutes from './routes/users.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import sourcesRoutes from './routes/sources.routes.js';
import projectSourcesRoutes from './routes/projectSources.routes.js';
import canonicalSchemasRoutes from './routes/canonicalSchemas.routes.js';
import processingJobsRoutes from './routes/processingJobs.routes.js';
import datasetsRoutes from './routes/datasets.routes.js';

const app = express();

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use(healthRoutes);
app.use(authRoutes);
app.use(organisationRoutes);
app.use(usersRoutes);
app.use(projectsRoutes);
app.use(sourcesRoutes);
app.use(projectSourcesRoutes);
app.use(canonicalSchemasRoutes);
app.use(processingJobsRoutes);
app.use(datasetsRoutes);

// JSON parse error handler
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Serve static files in production
if (config.isProduction) {
  const clientDist = path.resolve('dist/client');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const port = config.isProduction ? config.port : config.apiPort;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

export default app;
