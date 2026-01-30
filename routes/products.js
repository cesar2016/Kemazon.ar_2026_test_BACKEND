const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer
// Configure Multer - Memory Storage for validation and processing
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed'));
    }
});

// Routes
router.post('/', upload.array('images', 6), productController.createProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.get('/user/:userId', productController.getProductsByUserId);
router.delete('/:id', productController.deleteProduct);
router.put('/:id', upload.array('images', 6), productController.updateProduct);

module.exports = router;
