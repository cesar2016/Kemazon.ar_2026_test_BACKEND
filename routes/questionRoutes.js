const express = require('express');
const router = express.Router();
const { createQuestion, getQuestionsByProduct, answerQuestion } = require('../controllers/questionController');
const auth = require('../middlewares/authMiddleware');

// @route   POST api/questions
// @desc    Create a question
// @access  Private
router.post('/', auth, createQuestion);

// @route   GET api/questions/:productId
// @desc    Get questions for a product
// @access  Public
router.get('/:productId', getQuestionsByProduct);

// @route   PUT api/questions/:id/answer
// @desc    Answer a question
// @access  Private (Owner only)
router.put('/:id/answer', auth, answerQuestion);

module.exports = router;
