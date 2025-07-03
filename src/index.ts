import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import * as dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import postRoutes from './routes/post.routes';
import analysisRoutes from './routes/analysis.routes';
import { errorHandler } from './middleware/error';
import socialRoutes from './routes/social.routes';
// import { requestLogger } from './middleware/common';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Add request logging middleware
// app.use(requestLogger);

// Mount routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/posts', postRoutes);
app.use('/analysis', analysisRoutes);
app.use('/social', socialRoutes);

// Error handling middleware (should be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

//return status server running
app.get('/status', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});
