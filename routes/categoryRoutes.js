const express = require('express');
const router = express.Router();
const { getAllCategories } = require('../controllers/categoryController');

// @route   GET api/categories
// @desc    Get all categories
// @access  Public
router.get('/', getAllCategories);

module.exports = router;
