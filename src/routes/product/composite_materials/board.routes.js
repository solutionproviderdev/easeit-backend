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
    .get(checkAuth, boardSearchValidation, getAllBoards)
    .post(checkAuth, validateBoard, createBoard);

boardRouter
    .route('/:id')
    .get(checkAuth, validateBoardId, getBoardById)
    .put(checkAuth, validateBoardId, validateBoard, updateBoard)
    .delete(checkAuth, validateBoardId, deleteBoard);

module.exports = boardRouter;