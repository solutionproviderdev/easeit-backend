const { validationResult } = require('express-validator');
const Board = require('../../../schemas/products/composite-materials/BoardSchema');

const createBoard = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const board = new Board(req.body);
        await board.save();
        res.status(201).json(board);
    } catch (err) {
        res.status(500).json({ message: 'Failed to create board', error: err.message });
    }
};

const updateBoard = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const board = await Board.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        res.status(200).json(board);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update board', error: err.message });
    }
};

const deleteBoard = async (req, res) => {
    try {
        const board = await Board.findByIdAndDelete(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        res.status(200).json({ message: 'Board deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete board', error: err.message });
    }
};

const getAllBoards = async (req, res) => {
    const { search, brand, surfaceFinish, baseMaterial, thickness, sort, limit, page, fields } =        req.query;

    try {
        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (brand) query.brand = brand;
        if (surfaceFinish) query.surfaceFinish = surfaceFinish;
        if (baseMaterial) query.baseMaterial = baseMaterial;
        if (thickness) query.thickness = thickness;

        const projection = fields ? fields.split(',').join(' ') : {};

        const boards = await Board.find(query)
            .sort(sort || { createdAt: -1 })
            .limit(parseInt(limit) || 10)
            .skip(parseInt(page) ? (parseInt(page) - 1) * parseInt(limit || 10) : 0)
            .select(projection);

        res.status(200).json(boards);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch boards', error: err.message });
    }
};

const getBoardById = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        res.status(200).json(board);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch board', error: err.message });
    }
};

module.exports = {
    createBoard,
    updateBoard,
    deleteBoard,
    getAllBoards,
    getBoardById,
};
