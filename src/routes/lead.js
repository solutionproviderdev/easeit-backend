/* eslint-disable no-await-in-loop */
/* eslint-disable no-param-reassign */
/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
const express = require('express');
const { parse } = require('json2csv');
const fs = require('fs');
const { default: parsePhoneNumberFromString } = require('libphonenumber-js');
const moment = require('moment');
const { upload } = require('../config/multerconfig');
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
const Lead = require('../schemas/LeadsSchema');
const People = require('../schemas/PeopleSchema');
const Settings = require('../schemas/SettingsSchema');
const leadConversationRouter = require('./native-routes/lead-center/leadConversation');

const leadRouter = express.Router();

leadRouter.use('/conversation', leadConversationRouter);

// Retrieve a list of all leads
leadRouter.get('/', getLeads);

// Retrieve names and IDs of all leads for dropdown or autocomplete options
leadRouter.get('/names', getLeadsName);

// Retrieve details of a specific lead by ID
leadRouter.get('/:id', getLeadDetails);

// Create a new lead with optional image uploads
leadRouter.post('/', upload.array('images'), addLeads);

// Add a comment to a specific lead by ID with optional image uploads
leadRouter.post('/comment/:id', upload.array('images'), addComment);

// Update a lead to fix a meeting
leadRouter.put('/fixMeeting/:id', fixMeeting);

// Update a lead to Rescheduled Meeting
leadRouter.put('/rescheduleMeeting/:id', rescheduleMeeting);

// Update a lead's information by ID with optional file uploads (limited to 3 files)
leadRouter.put('/:id', upload.array('images', 3), updateLeadbyStatus);

// Update the CRE name of a specific lead by ID
leadRouter.put('/:id/creName', updateCreName);

// Route to handle lead tags
leadRouter.put('/:id/tags', updateLeadTags);

// Delete a specific lead by ID
leadRouter.delete('/:id', deleteLead);

// Function to reassign leads to the correct CRE based on message content
const reAssignToRightCRE = async () => {
    try {
        // Fetch all CREs
        const cres = await People.find({ role: 'CRE' });
        // Fetch all leads
        const leads = await Lead.find({}).populate('messages');

        // Prepare a mapping from names to CRE ids
        const nameToCreId = cres.reduce((map, cre) => {
            // Assume cre has a 'name' field you can split to get the last name part
            const lastName = cre.name.split(' ').pop();
            map[lastName] = cre._id;
            return map;
        }, {});

      //  console.log(nameToCreId);

        // For each lead, check every message
        leads.forEach(async (lead) => {
            for (const message of lead.messages) {
                const { content } = message;
                let found = false;

                // Check against each CRE name part
                for (const [lastName, creId] of Object.entries(nameToCreId)) {
                    if (content.includes(lastName)) {
                      //  console.log('Found a match:', lastName);
                        // Update the lead's CRE if a match is found
                        lead.creName = creId;
                        await lead.save();
                        found = true;
                        break;
                    }
                }

                // Stop checking if a CRE is assigned
                if (found) break;
            }
        });

      //  console.log('All leads have been reassigned appropriately.');
    } catch (error) {
      //console.error('Failed to reassign leads:', error);
    }
};

// reAssignToRightCRE();

// Helper function to extract last names from messages
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

      //  console.log('CSV file has been written successfully');
    } catch (error) {
      //console.error('Error fetching messages:', error);
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
          //  console.log('CSV file has been written successfully with valid phone numbers');
        } else {
          //  console.log('No valid phone numbers found in any messages.');
        }
    } catch (error) {
      //console.error('Error processing leads:', error);
    }
};

// parseAndExportLeadsWithPhoneNumbers();

const updateLeadsProfilePictures = async () => {
    try {
        const settings = await Settings.findOne({ name: 'facebook' });
        if (!settings || !settings.settingsData.page) {
          //console.error('Facebook settings or access token not found');
            return;
        }

        const pages = settings.settingsData.page;

        const leads = await Lead.find({});

        for (const lead of leads) {
            const pageSettings = pages.find((page) => page.pageId === lead.sourcePageId);
            if (pageSettings) {
                const { pageId } = pageSettings;
                // const pageDetails = await getPageNamePhoto(pageAccessToken, pageId);
                const sourcePageProfilePicture = `${process.env.SERVER_URL}/profile_pictures/${pageId}.jpg`;

                if (sourcePageProfilePicture) {
                    lead.sourcePageProfilePicture = sourcePageProfilePicture;

                    await lead.save();
                  //  console.log(`Updated lead ${lead._id} with new profile picture.`);
                }
            }
        }

      //  console.log('All leads have been updated.');
    } catch (error) {
      //console.error('Error updating leads:', error);
    }
};

// Call the function to update the leads
// updateLeadsProfilePictures();

module.exports = leadRouter;
