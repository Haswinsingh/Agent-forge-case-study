const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const caseStudyRoutes = require('./routes/caseStudies');
const submissionRoutes = require('./routes/submissions');
const evaluationRoutes = require('./routes/evaluations');
const resultRoutes = require('./routes/results');
const participantRoutes = require('./routes/participants');
const juryRoutes = require('./routes/jury');
const reportRoutes = require('./routes/reports');
const auditLogRoutes = require('./routes/auditLogs');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads folder for attached case study resources
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Agent Forge',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/case-studies', caseStudyRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/jury', juryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationRoutes);

// Production Static Client Serving
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Global Error Handler (Production-grade, no leaked stacks)
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || 'An unexpected internal error occurred. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Agent Forge High-Performance Server running on http://localhost:${PORT}`);
});
