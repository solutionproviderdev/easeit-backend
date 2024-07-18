const Lead = require('../schemas/LeadsSchema');

export const getLeads = async (req, res) => {
    try {
        // eslint-disable-next-line object-curly-newline
        const { date, status, creName, sortField, sortOrder } = req.query;

        // Build the query object
        const query = {};

        // Filter by specific date if provided
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setUTCHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setUTCHours(23, 59, 59, 999);
            query.createdAt = { $gte: startOfDay, $lte: endOfDay };
        }

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Filter by creName if provided
        if (creName) {
            query.creName = creName;
        }

        // Sorting options
        const sortOptions = {};
        if (sortField && sortOrder) {
            sortOptions[sortField] = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
        } else {
            sortOptions.createdAt = -1; // Default sorting by creation date descending
        }

        // Fetch leads from database
        const leads = await Lead.find(query).sort(sortOptions).populate('creName', 'name');

        res.json(leads);
    } catch (error) {
        res.status(500).send('Server error');
    }
};

export const addLead = async (req, res) => {};
