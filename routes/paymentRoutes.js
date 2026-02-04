const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middlewares/authMiddleware');

// Route to create a preference
// Authenticated user required? Usually yes for tracking, but optional for guest checkout.
// Using auth here to ensure we know who is buying if needed later.
router.post('/create_preference', auth, paymentController.createPreference);

module.exports = router;
