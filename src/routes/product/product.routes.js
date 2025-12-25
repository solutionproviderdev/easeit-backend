const express = require('express');

// Internal Imports
const baseMaterialsRouter = require('./materials/baseMaterial.routes');
const brandsRouter = require('./materials/brand.routes');
const hardwareRouter = require('./materials/hardwear.routes');
const surfaceRouter = require('./materials/surface.routes');
const seriesRouter = require('./series.routes');
const thicknessRouter = require('./materials/thickness.routes');
const surfaceFinishRouter = require('./materials/surfaceFinish.routes');
const edgingRouter = require('./composite_materials/edging.routes');
const colorRouter = require('./color/color.routes');
const boardRouter = require('./composite_materials/board.routes');

// Internal Imports
const {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById,
} = require('../../controller/product/product.controller');
const {
    validateProduct,
    productSearchValidation,
    validateProductId,
} = require('../../validators/product_validators/productValidator');
const { checkAuth } = require('../../middlewares/auth/checkAuth');

const hardwareItemRouter = require('./composite_materials/hardwareItems.routes');
const glassRouter = require('./composite_materials/glass.routes');

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
productRouter.use('/glass', glassRouter);
productRouter.use('/hardware-items', hardwareItemRouter);

// color
productRouter.use('/colors', colorRouter);

// Series
productRouter.use('/series', seriesRouter);

// Basic CRUD routes
productRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Products'] */
        /* #swagger.summary = 'Get all products' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, productSearchValidation, getAllProducts
    )
    .post(
        /* #swagger.tags = ['Products'] */
        /* #swagger.summary = 'Create a new product' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth, validateProduct, createProduct
    );

productRouter
    .route('/:id')
    .get(checkAuth, validateProductId, getProductById)
    .put(checkAuth, validateProductId, validateProduct, updateProduct)
    .delete(checkAuth, validateProductId, deleteProduct);

module.exports = productRouter;
