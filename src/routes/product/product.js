const express = require('express');

// Internal Imports
const baseMaterialsRouter = require('./materials/baseMaterial');
const brandsRouter = require('./materials/brand');
const hardwareRouter = require('./materials/hardwear');
const surfaceRouter = require('./materials/surface');
const seriesRouter = require('./series');
const thicknessRouter = require('./materials/thickness');
const surfaceFinishRouter = require('./materials/surfaceFinish');
const edgingRouter = require('./composite_materials/edging');
const colorRouter = require('./color/color');
const boardRouter = require('./composite_materials/board');

// Internal Imports
const {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
} = require('../../controller/product/productController');
const {
    validateProduct,
    productSearchValidation,
    validateProductId,
} = require('../../validators/product_validators/productValidator');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

// Router Declaration
const productRouter = express.Router();

// materials
productRouter.use('/base-materials', baseMaterialsRouter);
productRouter.use('/brands', brandsRouter);
productRouter.use('/hardwears', hardwareRouter);
productRouter.use('/surfaces', surfaceRouter);
productRouter.use('/thickness', thicknessRouter);
productRouter.use('/surface-finishes', surfaceFinishRouter);

// composit Materials
productRouter.use('/edgings', edgingRouter);
productRouter.use('/boards', boardRouter);

// color
productRouter.use('/colors', colorRouter);

// Series
productRouter.use('/series', seriesRouter);

// Basic CRUD routes
productRouter
    .route('/')
    .get(checkAuth, productSearchValidation, getAllProducts)
    .post(checkAuth, validateProduct, createProduct);

productRouter
    .route('/:id')
    .get(checkAuth, validateProductId, getProductById)
    .put(checkAuth, validateProductId, validateProduct, updateProduct)
    .delete(checkAuth, validateProductId, deleteProduct);

module.exports = productRouter;
