require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const questionRoutes = require('./routes/questionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());

// Trust Proxy for Render/Vercel (needed for proper protocol detection)
app.set('trust proxy', 1);

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/categories', categoryRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payment', paymentRoutes);

const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
app.use('/api/payment-methods', paymentMethodRoutes);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
    res.send('Kemazon.ar API Running - Red & Minimalist');
});

const socialRoutes = require('./routes/socialRoutes');
app.use('/social', socialRoutes);



// Start Server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;
