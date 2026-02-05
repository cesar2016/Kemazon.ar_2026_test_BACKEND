const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const auth = require('../middlewares/authMiddleware');

// @route   POST api/questions
// @desc    Create a question
// @access  Private
// This line is removed as it's a duplicate and the one below is preferred.

// Public routes
// @route   GET api/questions/:productId
// @desc    Get questions for a product
// @access  Public
router.get('/:productId', questionController.getQuestionsByProduct);

// Protected routes (require auth)
// @route   POST api/questions
// @desc    Create a question
// @access  Private
router.post('/', auth, questionController.createQuestion);

// @route   PUT api/questions/:id/answer
// @desc    Answer a question
// @access  Private (Owner only)
router.put('/:id/answer', auth, questionController.answerQuestion);

// @route   GET api/questions/user/received
// @desc    Get questions received by the authenticated user
// @access  Private
router.get('/user/received', auth, questionController.getReceivedQuestions);

// @route   GET api/questions/user/asked
// @desc    Get questions asked by the authenticated user
// @access  Private
router.get('/user/asked', auth, questionController.getAskedQuestions);

module.exports = router;
