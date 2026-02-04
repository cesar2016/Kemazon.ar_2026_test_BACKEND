const express = require('express');
const router = express.Router();
const paymentMethodController = require('../controllers/paymentMethodController');
const auth = require('../middlewares/authMiddleware');

// Get my methods
router.get('/', auth, paymentMethodController.getPaymentMethods);

// Save/Update method
router.post('/', auth, paymentMethodController.savePaymentMethod);

module.exports = router;
