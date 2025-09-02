exports.getLeadReportByName = async (req, res) => {
    try {
        const { name } = req.query;

        res.json({ name });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
