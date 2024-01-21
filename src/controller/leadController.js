/* eslint-disable prettier/prettier */
/* eslint-disable no-return-await */
const Lead = require('../schemas/LeadsSchema');
const generateCustomerID = require('../helpers/CustomerIdGenerator');

// Helper Functions
const addCommentToLead = async (leadId, images, comment, name) => {
    if (comment && name) {
        try {
            const lead = await Lead.findById(leadId);

            if (!lead) {
                throw new Error('Lead not found');
            }

            const newComment = {
                images,
                comment,
                name,
                date: new Date(),
            };

            lead.comment.push(newComment);
            await lead.save();

            return { success: true, lead };
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message || 'Internal Server Error' };
        }
    }
};

function extractLeadData(body, files) {
    const {
        status,
        source,
        creName,
        name,
        phone,
        futureClient,
        visitCharge,
        nextMsgData,
        nextCallData,
        remark,
        meetingData,
        address,
        positive,
        projectStatus,
        projectLocation,
        workScope,
        time,
        date,
        salesExqName,
    } = body;

    const fileNames = files?.map((file) => `${process.env.SERVER_URL}/images/${file.filename}`);
    let workScopes = [];
    if (Array.isArray(workScope)) {
        workScopes = workScope.map((scope) => ({
            scope,
        }));
    }
    return {
        time,
        date,
        status,
        source,
        creName,
        name,
        phone,
        visitCharge,
        remark,
        meetingData,
        address,
        nextMsgData,
        nextCallData,
        positive,
        salesExqName,
        projectStatus,
        projectLocation,
        workScopes,
        fileNames,
        futureClient,
    };
}

async function createLead(leadData) {
    const newLead = new Lead({
        CID: leadData.phone ? generateCustomerID(leadData.name, leadData.phone) : '',
        status: leadData.status,
        source: leadData.source,
        creName: leadData.creName,
        name: leadData.name,
        phone: leadData.phone,
        visitCharge: leadData.visitCharge,
        meetingData: {
            time: leadData.time,
            date: leadData.date,
        },
    });

    return await newLead.save();
}

const getLeads = async (req, res) => {
    try {
        // Extract creName and limit from query parameters
        const { creName, limit } = req.query;

        // Build the query
        let query = Lead.find({});
        if (creName) {
            // Filter by creName if provided
            query = query.where('creName').equals(creName);
        }

        // Apply limit if provided
        if (limit) {
            query = query.limit(Number(limit)); // Convert limit to a number
        }

        // Sort by creation date (newest first)
        const leads = await query.sort({ createdAt: -1 });

        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const addLeads = async (req, res) => {
    try {
        const leadData = extractLeadData(req.body, req.files);

        // Perform any necessary validation checks
        // ...

        const newLead = new Lead({
            CID: leadData.phone ? generateCustomerID(leadData.name, leadData.phone) : '',
            status: leadData.status,
            source: leadData.source,
            creName: leadData.creName,
            name: leadData.name,
            phone: leadData.phone,
            visitCharge: leadData.visitCharge,
            meetingData: [{
                time: leadData.time,
                date: leadData.date,
            }],
            address: leadData.address,
            projectStatus: leadData.projectStatus,
            projectLocation: leadData.projectLocation,
            workScope: leadData.workScopes,
            positive: leadData.positive,
        });

        const savedLead = await newLead.save();

        res.status(200).json({
            message: 'New Lead Added Successfully',
            lead: savedLead,
        });
    } catch (error) {
        console.error(error);

        // Provide a more specific error message based on the nature of the error
        let errorMessage = 'There was a server side error';
        if (error.name === 'ValidationError') {
            errorMessage = 'Validation error. Please check your input.';
        }

        res.status(500).json({ error: errorMessage });
    }
};

const addComment = async (req, res) => {
    try {
        const leadData = extractLeadData(req.body, req.files);
        const { id } = req.params;

        const savedComment = await addCommentToLead(
            id,
            leadData.fileNames,
            leadData.remark,
            leadData.creName
        );

        res.status(200).json({ message: 'Comment added successfully', savedComment });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const updateLead = async (req, res) => {
    const { id } = req.params;
    const {
 status, workScops, fileNames, remark, creName, meetingData, ...updateData
} = extractLeadData(req.body, req.files);

    try {
        await addCommentToLead(id, fileNames, remark, creName);

        // Use findById to get the lead data by ID
        const lead = await Lead.findById(id);

        const update = { $set: { status } };

        switch (status) {
            case 'No Response':
            case 'Need Support':
                // If status is 'No Response' or 'Need Support', no additional data is needed
                break;
            case 'Message Rescheduled':
                update.$set.nextMsgData = updateData.nextMsgData;
                break;
            case 'Number Collected':
                update.$set.phone = updateData.phone;
                update.$set.CID = generateCustomerID(lead.name, updateData.phone);
                break;
            case 'Call Reschedule':
                update.$set.nextCallData = updateData.nextCallData;
                break;
            case 'Future Client':
                update.$set.nextCallData = updateData.nextCallData;
                break;
            case 'Meeting Fixed':
                if (
                    !updateData.address
                    || !updateData.projectStatus
                    || !updateData.projectLocation
                ) {
                    return res
                        .status(400)
                        .json({ message: 'Missing required fields for scheduling a meeting.' });
                }

                // Include all fields for 'Meeting Fixed' status
                update.$set = { ...update.$set, ...updateData };
                update.$push = {
                    meetingData,
                    workScope: { $each: updateData.workScopes }
                };
                break;
            case 'Meeting Reschedule':
                update.$push.meetingData = updateData.meetingData;
                break;
            case 'Cancel Meeting':
                // Just Status will be change so no need to update anything
                break;
            default:
                return res.status(400).json({ message: 'Invalid status provided.' });
        }

        const updatedLead = await Lead.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
        });
        if (!updatedLead) {
            return res.status(404).json({ message: 'Lead not found.' });
        }
        res.status(200).json({
            message: `Lead status updated to '${status}'.`,
            updatedLead,
        });
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({
            error: 'There was a server side error',
            message: error.message,
        });
    }
};

const updateCreName = async (req, res) => {
    const { id } = req.params;
    const { creName } = req.body;

    try {
        const updatedLead = await Lead.findByIdAndUpdate(
            id,
            { creName },
            { new: true } // Return the updated document
        );

        if (!updatedLead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        res.status(200).json({ message: 'CRE name updated successfully', updatedLead });
    } catch (error) {
        // console.log(error);
        res.status(500).json({ error: 'There was a server side error' });
    }
};

const deleteLead = async (req, res) => {
    try {
        await Lead.deleteOne({ _id: req.params.id });
        res.status(200).json({ message: 'Lead Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'There was a server side error' });
    }
};

module.exports = {
    createLead,
    extractLeadData,
    addCommentToLead,
    addLeads,
    addComment,
    updateCreName,
    updateLead,
    deleteLead,
    getLeads,
};
