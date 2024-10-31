import express from 'express';
import routes from './routes/index.js';

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/', routes);

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});