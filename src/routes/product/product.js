const express = require('express');

// Internal Imports
const baseMaterialsRouter = require('./materials/baseMaterial');
// const {} = require('../../controller/productController');
// const {} = require('../../validators/productValidator.js');

// Router Declaration
const productRouter = express.Router();

productRouter.use('/base-materials', baseMaterialsRouter);

module.exports = productRouter;
