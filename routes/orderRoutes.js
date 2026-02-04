const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middlewares/authMiddleware');

router.post('/confirm', auth, orderController.confirmOrder);
router.get('/purchases', auth, orderController.getPurchases);
router.get('/sales', auth, orderController.getSales);

module.exports = router;
