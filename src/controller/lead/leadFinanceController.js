// leadFinanceController.js

const momenttz = require('moment-timezone');
const Department = require('../../schemas/auth/DepartmentSchema');
const User = require('../../schemas/auth/UserSchema');
const Lead = require('../../schemas/LeadsSchema');
const { formatDateRange } = require('../../helpers/firmatDateRange');

exports.getAllLeadsWithFinanceDetails = async (req, res) => {
    try {
        // Get filter values from query parameters
        const { cre, sales, status, startDate, endDate } = req.query;

        // Build the filter object for leads with finance details
        const filter = {
            finance: { $exists: true },
        };

        // Apply status filter: if provided as a comma-separated list, else default
        if (status) {
            filter.status = { $in: status.split(',') };
        } else {
            filter.status = {
                $in: ['Meeting Fixed', 'Meeting Complete', 'Sold', 'Prospect'],
            };
        }

        // Apply CRE filter if provided
        if (cre) {
            filter.creName = cre;
        }

        // Apply Sales filter if provided
        if (sales) {
            filter.salesExqName = sales;
        }

        // Apply Date Range filter based on createdAt if both startDate and endDate are provided
        if (startDate && endDate) {
            // const start = new Date(startDate);
            // const end = new Date(endDate);

            const { start, end } = formatDateRange(startDate, endDate);

            console.log('start time:', start);
            console.log('end time:', end);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                filter.createdAt = { $gte: start, $lte: end };
            }
        }

        // Query the Lead collection with the filters and populate meetings,
        // CRE, and sales executive details.
        const leads = await Lead.find(filter)
            .populate({
                path: 'meetings',
                select: 'slot date -lead',
            })
            .populate('creName', 'nameAsPerNID profilePicture')
            .populate('salesExqName', 'nameAsPerNID profilePicture')
            .select('-messages')
            .exec();

        // Remove the populated "lead" field from each meeting manually.
        leads.forEach((lead) => {
            if (lead.meetings && Array.isArray(lead.meetings)) {
                lead.meetings.forEach((meeting) => {
                    if (meeting.lead) {
                        // eslint-disable-next-line no-param-reassign
                        delete meeting.lead;
                    }
                });
            }
        });

        // Initialize sums and counts for the bar chart data
        let followUp = 0;
        let followUpCount = 0;
        let prospect = 0;
        let prospectCount = 0;
        let sold = 0;
        let soldCount = 0;
        let totalPaid = 0;
        let totalDue = 0;

        // Calculate the sums and counts for each category based on lead status and finance values
        leads.forEach((lead) => {
            if (lead.finance) {
                // Sum project value for Meeting Complete leads (Follow-Up)
                if (lead.status === 'Meeting Complete' && lead.finance.projectValue) {
                    followUp += lead.finance.projectValue;
                    followUpCount++;
                }
                // Sum project value for Prospect leads
                if (lead.status === 'Prospect' && lead.finance.projectValue) {
                    prospect += lead.finance.projectValue;
                    prospectCount++;
                }
                // Sum sold amount for Sold leads
                if (lead.status === 'Sold' && lead.finance.soldAmmount) {
                    sold += lead.finance.soldAmmount;
                    soldCount++;
                }
                // Sum total payment and total due from finance regardless of lead status
                if (lead.finance.totalPayment) {
                    totalPaid += lead.finance.totalPayment;
                }
                if (lead.finance.totalDue) {
                    totalDue += lead.finance.totalDue;
                }
            }
        });

        // Build the chart data object including counts
        const chartData = {
            followUp,
            followUpCount,
            prospect,
            prospectCount,
            sold,
            soldCount,
            totalPaid,
            totalDue,
        };

        // Query the User collection for filter options:
        // 1. Get the CRE department and roles from the Department schema.
        const creDepartment = await Department.findOne({
            departmentName: 'CRE',
        }).select('roles');
        if (!creDepartment || !creDepartment.roles) {
            throw new Error('CRE department or roles not found');
        }
        // Filter the CRE role from the department roles.
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            throw new Error('CRE role not found in department');
        }
        // Retrieve all active CREs with the role 'CRE' from the User schema.
        const creOptions = await User.find({
            roleId: creRole._id,
        }).select('_id nameAsPerNID profilePicture');

        // 2. Get the Sales department and roles from the Department schema.
        const salesDepartment = await Department.findOne({
            departmentName: 'Sales',
        }).select('roles');
        if (!salesDepartment || !salesDepartment.roles) {
            throw new Error('Sales department or roles not found');
        }
        // Filter the Sales Executive role from the department roles.
        const salesRole = salesDepartment.roles.find((role) => role.roleName === 'Sales');
        if (!salesRole) {
            throw new Error('Sales Executive role not found in department');
        }
        // Retrieve all active Sales Executives with the role 'Sales Executive' from the User schema.
        const salesOptions = await User.find({
            roleId: salesRole._id,
        }).select('_id nameAsPerNID profilePicture');

        // Define status options (could also be derived from your Lead schema enum)
        const statusOptions = ['Meeting Complete', 'Sold', 'Prospect'];

        // Build the filterData object
        const filterData = {
            creOptions,
            salesOptions,
            statusOptions,
        };

        // Return the leads, bar chart data, and filter data in the response
        res.status(200).json({
            leads,
            chartData,
            filterData,
        });
    } catch (error) {
        console.error('Error fetching leads with finance details:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to get finance details for a lead.
 * GET /finance/:leadID
 */
exports.getFinanceDetails = async (req, res) => {
    try {
        const { leadID } = req.params;
        const lead = await Lead.findById(leadID).select('finance _id');
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.status(200).json(lead.finance || {});
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
