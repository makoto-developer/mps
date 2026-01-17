import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authenticationRouter from '../routes/authentication.routes';
import roomsRouter from '../routes/rooms.routes';
import messagesRouter from '../routes/messages.routes';
import drawingRouter from '../routes/drawing.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DrawingApp API'
  });
});

// API Routes
app.use(authenticationRouter);
app.use(roomsRouter);
app.use(messagesRouter);
app.use(drawingRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`🏠 Room endpoints: http://localhost:${PORT}/api/rooms/*`);
  console.log(`💬 Message endpoints: http://localhost:${PORT}/api/rooms/:roomId/messages`);
  console.log(`🎨 Drawing endpoints: http://localhost:${PORT}/api/rooms/:roomId/strokes`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});
