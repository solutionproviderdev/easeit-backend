const express = require('express');

// Internal Imports
const {
    createBoard,
    updateBoard,
    deleteBoard,
    getAllBoards,
    getBoardById,
} = require('../../../controller/product/composite_materials/board.controller');
const {
    validateBoard,
    boardSearchValidation,
    validateBoardId,
} = require('../../../validators/product_validators/composite_materials/boardValidator');
const { checkAuth } = require('../../../middlewares/auth/checkAuth');

const boardRouter = express.Router();

// Basic CRUD routes
boardRouter
    .route('/')
    .get(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Get all boards' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth,
        boardSearchValidation,
        getAllBoards
    )
    .post(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Create board' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth,
        validateBoard,
        createBoard
    );

boardRouter
    .route('/:id')
    .get(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Get board by ID' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth,
        validateBoardId,
        getBoardById
    )
    .put(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Update board' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth,
        validateBoardId,
        validateBoard,
        updateBoard
    )
    .delete(
        /* #swagger.tags = ['Composite Materials'] */
        /* #swagger.summary = 'Delete board' */
        /* #swagger.security = [{ "bearerAuth": [] }] */
        checkAuth,
        validateBoardId,
        deleteBoard
    );

module.exports = boardRouter;
