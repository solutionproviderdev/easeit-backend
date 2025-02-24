// leadFinanceController.js
const Lead = require('../../schemas/LeadsSchema');

/**
 * Controller to get finance details for a lead.
 * GET /finance/:leadID
 */
exports.getFinanceDetails = async (req, res) => {
    try {
        const { leadID } = req.params;
        const lead = await Lead.findById(leadID).select('finance');
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.status(200).json(lead.finance || []);
    } catch (error) {
        console.error('Error fetching finance details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Helper function to recalculate total payment and total due.
 */
const recalculateFinance = (lead) => {
    // Calculate total paid amount (sum only "Paid" payments)
    lead.finance.totalPayment = lead.finance.payments
        .filter((payment) => payment.paymentStatus === 'Paid')
        .reduce((sum, payment) => sum + payment.amount, 0);

    // Calculate total due (sold amount - total payment)
    lead.finance.totalDue = (lead.finance.soldAmmount || 0) - lead.finance.totalPayment;
};

/**
 * Controller to add a new payment to a lead's finance section.
 * POST /finance/:leadID/payment
 */
exports.addPayment = async (req, res) => {
    try {
        const { leadID } = req.params;
        const {
 amount, paymentMethod, paymentDate, paymentStatus, paymentNote 
} = req.body;

        // Validate required fields
        if (amount === undefined || !paymentMethod || !paymentDate || !paymentStatus) {
            return res.status(400).json({ error: 'Required payment fields missing' });
        }

        // Find the lead by ID
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Initialize finance field if not present
        if (!lead.finance) {
            lead.finance = { payments: [], totalPayment: 0, totalDue: 0 };
        }

        // Create new payment object
        const newPayment = {
            amount,
            paymentMethod,
            paymentDate,
            paymentStatus,
            paymentNote: paymentNote || '',
        };

        // Add new payment to the payments array
        lead.finance.payments.push(newPayment);

        // Recalculate total payment and total due
        recalculateFinance(lead);

        await lead.save();

        res.status(201).json({
            message: 'Payment added successfully',
            payment: newPayment,
            totalPayment: lead.finance.totalPayment,
            totalDue: lead.finance.totalDue,
        });
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to update an existing payment in a lead's finance section.
 * PUT /finance/:leadID/payment/:paymentID
 */
exports.updatePayment = async (req, res) => {
    try {
        const { leadID, paymentID } = req.params;
        const {
 amount, paymentMethod, paymentDate, paymentStatus, paymentNote 
} = req.body;

        // Find the lead by ID
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        if (!lead.finance || !lead.finance.payments) {
            return res.status(404).json({ error: 'No payment records found for this lead' });
        }

        // Find the index of the payment to update
        const paymentIndex = lead.finance.payments.findIndex(
            (payment) => payment._id.toString() === paymentID
        );
        if (paymentIndex === -1) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update fields if provided
        if (amount !== undefined) lead.finance.payments[paymentIndex].amount = amount;
        if (paymentMethod) lead.finance.payments[paymentIndex].paymentMethod = paymentMethod;
        if (paymentDate) lead.finance.payments[paymentIndex].paymentDate = paymentDate;
        if (paymentStatus) lead.finance.payments[paymentIndex].paymentStatus = paymentStatus;
        if (paymentNote !== undefined)
            lead.finance.payments[paymentIndex].paymentNote = paymentNote;

        // Recalculate total payment and total due
        recalculateFinance(lead);

        await lead.save();

        res.status(200).json({
            message: 'Payment updated successfully',
            payment: lead.finance.payments[paymentIndex],
            totalPayment: lead.finance.totalPayment,
            totalDue: lead.finance.totalDue,
        });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to delete a payment from a lead's finance section.
 * DELETE /finance/:leadID/payment/:paymentID
 */
exports.deletePayment = async (req, res) => {
    try {
        const { leadID, paymentID } = req.params;

        // Find the lead by ID
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        if (!lead.finance || !lead.finance.payments) {
            return res.status(404).json({ error: 'No payment records found for this lead' });
        }

        // Find the payment to be deleted
        const paymentToDelete = lead.finance.payments.find(
            (payment) => payment._id.toString() === paymentID
        );

        if (!paymentToDelete) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Remove the payment from the payments array
        lead.finance.payments = lead.finance.payments.filter(
            (payment) => payment._id.toString() !== paymentID
        );

        // Recalculate total payment and total due
        recalculateFinance(lead);

        await lead.save();

        res.status(200).json({
            message: 'Payment deleted successfully',
            totalPayment: lead.finance.totalPayment,
            totalDue: lead.finance.totalDue,
        });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Update Finance Details (clientsBudget, projectValue, soldAmount)
 * PUT /finance/:leadID
 */
exports.updateFinanceDetails = async (req, res) => {
    try {
        const { leadID } = req.params;
        const { clientsBudget, projectValue, soldAmount } = req.body;

        // Validate input: Check if at least one field is provided
        if (clientsBudget === undefined && projectValue === undefined && soldAmount === undefined) {
            return res.status(400).json({ error: 'At least one field is required to update' });
        }

        // Find the lead by ID
        const lead = await Lead.findById(leadID);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Update finance details in the lead document
        if (clientsBudget !== undefined) {
            if (clientsBudget < 0)
                return res.status(400).json({ error: 'Invalid clientsBudget value' });
            lead.finance.clientsBudget = clientsBudget;
        }
        if (projectValue !== undefined) {
            if (projectValue < 0)
                return res.status(400).json({ error: 'Invalid projectValue value' });
            lead.finance.projectValue = projectValue;
        }
        if (soldAmount !== undefined) {
            if (soldAmount < 0) return res.status(400).json({ error: 'Invalid soldAmount value' });
            lead.finance.soldAmmount = soldAmount;
        }

        // Recalculate total payment and total due
        recalculateFinance(lead);

        await lead.save();

        res.status(200).json({
            message: 'Finance details updated successfully',
            finance: lead.finance,
        });
    } catch (error) {
        console.error('Error updating finance details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
