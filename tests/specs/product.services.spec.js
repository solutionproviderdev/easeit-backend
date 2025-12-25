/* eslint-env jest,node */
jest.mock('../../src/schemas/products/ProductSchema', () => {
    const saveMock = jest.fn();

    function ProductMock(data) {
        Object.assign(this, data);
    }
    ProductMock.prototype.save = saveMock;
    ProductMock.find = jest.fn();
    ProductMock.findById = jest.fn();
    ProductMock.findByIdAndUpdate = jest.fn();
    ProductMock.findByIdAndDelete = jest.fn();

    ProductMock.__saveMock = saveMock;

    return ProductMock;
});

const service = require('../../src/services/product.services');
const Product = require('../../src/schemas/products/ProductSchema');

describe('Product Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('createProduct saves and returns product', async () => {
        Product.__saveMock.mockResolvedValueOnce(undefined);
        const data = { name: 'Test', specifications: { pricePerSqFt: 100 } };
        const result = await service.createProduct(data);
        expect(Product.__saveMock).toHaveBeenCalledTimes(1);
        expect(result.name).toBe('Test');
    });

    test('createProduct propagates save error', async () => {
        Product.__saveMock.mockRejectedValueOnce(new Error('save failed'));
        await expect(service.createProduct({ name: 'Bad' })).rejects.toThrow('save failed');
    });

    test('getAllProducts builds query and chains mongoose calls', async () => {
        const mockList = [{ name: 'A' }, { name: 'B' }];
        const sort = jest.fn().mockReturnThis();
        const limit = jest.fn().mockReturnThis();
        const skip = jest.fn().mockResolvedValue(mockList);
        Product.find.mockReturnValue({ sort, limit, skip });

        const params = { search: 'x', limit: '2', page: '1' };
        const res = await service.getAllProducts(params);
        expect(Product.find).toHaveBeenCalledTimes(1);
        expect(sort).toHaveBeenCalled();
        expect(limit).toHaveBeenCalled();
        expect(skip).toHaveBeenCalled();
        expect(res).toEqual(mockList);
    });

    test('getProductById returns product', async () => {
        Product.findById.mockResolvedValueOnce({ _id: '1', name: 'P' });
        const res = await service.getProductById('1');
        expect(Product.findById).toHaveBeenCalledWith('1');
        expect(res.name).toBe('P');
    });

    test('updateProduct returns updated product', async () => {
        Product.findByIdAndUpdate.mockResolvedValueOnce({ _id: '1', name: 'New' });
        const res = await service.updateProduct('1', { name: 'New' });
        expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
            '1',
            { name: 'New' },
            expect.any(Object)
        );
        expect(res.name).toBe('New');
    });

    test('deleteProduct returns deleted product', async () => {
        Product.findByIdAndDelete.mockResolvedValueOnce({ _id: '1' });
        const res = await service.deleteProduct('1');
        expect(Product.findByIdAndDelete).toHaveBeenCalledWith('1');
        expect(res._id).toBe('1');
    });
});
