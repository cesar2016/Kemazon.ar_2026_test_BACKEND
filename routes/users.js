const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');

const auth = require('../middlewares/authMiddleware');

// Configure Multer (Memory Storage for Sharp processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// @route   GET api/users
// @desc    Get all users
// @access  Private/Admin
router.get('/', auth, auth.verifyAdmin, userController.getAllUsers);

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', userController.getUserById);

// @route   PUT api/users/:id
// @desc    Update user
// @access  Public (Should be Private/Self - pending update)
router.put('/:id', upload.single('avatar'), userController.updateUser);

// @route   PUT api/users/:id/status
// @desc    Block/Unblock user
// @access  Private/Admin
router.put('/:id/status', auth, auth.verifyAdmin, userController.toggleUserStatus);

// @route   PUT api/users/:id/role
// @desc    Change user role
// @access  Private/Admin
router.put('/:id/role', auth, auth.verifyAdmin, userController.updateUserRole);

// @route   DELETE api/users/:id
// @desc    Delete user
// @access  Public (Should be Private/Admin or Self)
router.delete('/:id', userController.deleteUser);

module.exports = router;
