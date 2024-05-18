/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
const express = require('express');
const { parse } = require('json2csv');
const fs = require('fs');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const moment = require('moment');
const upload = require('../config/multerconfig');
const {
    addLeads,
    getLeads,
    fixMeeting,
    deleteLead,
    addComment,
    getLeadsName,
    updateCreName,
    getLeadDetails,
    updateLeadTags,
    rescheduleMeeting,
    updateLeadbyStatus,
} = require('../controller/leadController');
const { checkLogin } = require('../middlewares/auth/checkLogin');
const Lead = require('../schemas/LeadsSchema');

const leadRouter = express.Router();

// Retrieve a list of all leads
leadRouter.get('/', checkLogin, getLeads);

// Retrieve names and IDs of all leads for dropdown or autocomplete options
leadRouter.get('/names', checkLogin, getLeadsName);

// Retrieve details of a specific lead by ID
leadRouter.get('/:id', checkLogin, getLeadDetails);

// Create a new lead with optional image uploads
leadRouter.post('/', checkLogin, upload.array('images'), addLeads);

// Add a comment to a specific lead by ID with optional image uploads
leadRouter.post('/comment/:id', checkLogin, upload.array('images'), addComment);

// Update a lead to fix a meeting
leadRouter.put('/fixMeeting/:id', fixMeeting);

// Update a lead to Rescheduled Meeting
leadRouter.put('/rescheduleMeeting/:id', rescheduleMeeting);

// Update a lead's information by ID with optional file uploads (limited to 3 files)
leadRouter.put('/:id', checkLogin, upload.array('images', 3), updateLeadbyStatus);

// Update the CRE name of a specific lead by ID
leadRouter.put('/:id/creName', checkLogin, updateCreName);

// Route to handle lead tags
leadRouter.put('/:id/tags', checkLogin, updateLeadTags);

// Delete a specific lead by ID
leadRouter.delete('/:id', checkLogin, deleteLead);

const getMessages = async () => {
    try {
        const messages = await Lead.aggregate([
            { $unwind: '$messages' },
            {
                $project: {
                    _id: 0,
                    messageId: '$messages.messageId',
                    content: '$messages.content',
                    senderId: '$messages.senderId',
                    sentByMe: '$messages.sentByMe',
                    date: '$messages.date',
                },
            },
        ]);

        const csv = parse(messages);
        fs.writeFileSync('messages.csv', csv);

        console.log('CSV file has been written successfully');
    } catch (error) {
        console.error('Error fetching messages:', error);
    }
};
// getMessages();

const parseAndExportLeadsWithPhoneNumbers = async () => {
    try {
        const leads = await Lead.find({}).lean(); // Fetch all leads

        const results = [];

        for (const lead of leads) {
            if (lead.messages) {
                for (const message of lead.messages) {
                    if (message.sentByMe) {
                        // eslint-disable-next-line no-continue
                        continue;
                    }
                    const content = message.content || '';
                    const potentialNumber = content.replace(/[^0-9]+/g, '');
                    try {
                        const phoneNumber = parsePhoneNumberFromString(potentialNumber, 'BD');
                        if (
                            phoneNumber
                            && phoneNumber?.number?.length === 14
                            && phoneNumber.country === 'BD'
                        ) {
                            results.push({
                                name: lead.name,
                                phoneNumber: phoneNumber.formatInternational(),
                                date: moment(lead.createdAt).format('MM/DD/YYYY'),
                            });
                            break; // Stop after the first valid phone number for this lead
                        }
                    } catch (error) {
                        // Do nothing
                    }
                }
            }
        }

        if (results.length > 0) {
            const csv = parse(results, { fields: ['name', 'phoneNumber', 'date'] });
            fs.writeFileSync('leads_with_phone_numbers.csv', csv);
            console.log('CSV file has been written successfully with valid phone numbers');
        } else {
            console.log('No valid phone numbers found in any messages.');
        }
    } catch (error) {
        console.error('Error processing leads:', error);
    }
};

// parseAndExportLeadsWithPhoneNumbers();

module.exports = leadRouter;
