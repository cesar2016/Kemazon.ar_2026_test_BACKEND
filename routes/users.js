const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');

// Configure Multer (Memory Storage for Sharp processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// @route   GET api/users
// @desc    Get all users
// @access  Public (Change to Private/Admin later)
router.get('/', userController.getAllUsers);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', userController.getUserById);

// @route   PUT api/users/:id
// @desc    Update user
// @access  Public (Should be Private/Self)
router.put('/:id', upload.single('avatar'), userController.updateUser);

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Public (Should be Private/Admin or Self)
router.delete('/:id', userController.deleteUser);

module.exports = router;
