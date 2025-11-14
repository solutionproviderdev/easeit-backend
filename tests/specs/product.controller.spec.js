/* eslint-env jest,node */
jest.mock('express-validator', () => ({ validationResult: jest.fn() }));
const { validationResult } = require('express-validator');

jest.mock('../../src/services/product.services', () => ({
    createProduct: jest.fn(),
    getAllProducts: jest.fn(),
    getProductById: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
}));

const service = require('../../src/services/product.services');
const controller = require('../../src/controller/product/product.controller');

function mockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
}

describe('Product Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    });

    test('createProduct returns 201 on success', async () => {
        const req = { body: { name: 'X' } };
        const res = mockRes();
        service.createProduct.mockResolvedValueOnce({ _id: '1', name: 'X' });

        await controller.createProduct(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ _id: '1', name: 'X' });
    });

    test('createProduct returns 400 on validation errors', async () => {
        validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'bad' }] });
        const req = { body: {} };
        const res = mockRes();

        await controller.createProduct(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ errors: [{ msg: 'bad' }] });
    });

    test('updateProduct returns 200 when updated', async () => {
        const req = { params: { id: '1' }, body: { name: 'N' } };
        const res = mockRes();
        service.updateProduct.mockResolvedValueOnce({ _id: '1', name: 'N' });

        await controller.updateProduct(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ _id: '1', name: 'N' });
    });

    test('updateProduct returns 404 when not found', async () => {
        const req = { params: { id: '1' }, body: { name: 'N' } };
        const res = mockRes();
        service.updateProduct.mockResolvedValueOnce(null);

        await controller.updateProduct(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' });
    });

    test('deleteProduct returns 200 when deleted', async () => {
        const req = { params: { id: '1' } };
        const res = mockRes();
        service.deleteProduct.mockResolvedValueOnce({ _id: '1' });

        await controller.deleteProduct(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Product deleted successfully' });
    });

    test('deleteProduct returns 404 when not found', async () => {
        const req = { params: { id: '1' } };
        const res = mockRes();
        service.deleteProduct.mockResolvedValueOnce(null);

        await controller.deleteProduct(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' });
    });

    test('getAllProducts returns 200 with list', async () => {
        const req = { query: {} };
        const res = mockRes();
        service.getAllProducts.mockResolvedValueOnce([{ name: 'A' }]);

        await controller.getAllProducts(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([{ name: 'A' }]);
    });

    test('getProductById returns 200 when found', async () => {
        const req = { params: { id: '1' } };
        const res = mockRes();
        service.getProductById.mockResolvedValueOnce({ _id: '1' });

        await controller.getProductById(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ _id: '1' });
    });

    test('getProductById returns 404 when not found', async () => {
        const req = { params: { id: '1' } };
        const res = mockRes();
        service.getProductById.mockResolvedValueOnce(null);

        await controller.getProductById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' });
    });
});