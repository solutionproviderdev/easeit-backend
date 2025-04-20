const {
    notifyDeletedMessagesToAdmin,
} = require('../helpers/notification/admin/MetaMessageDeleted');

const metaDeletedMessageAllart = async (processedMessages, lead, io) => {
    // Return early if lead or lead.messages is null/undefined
    if (!lead?.messages) {
        console.log('Lead or lead messages not found');
        return;
    }

    // create a copy of lead messages
    const crmMessage = [...lead.messages];

    // Remove duplicates based on messageId
    const uniqueCRMMessages = crmMessage.filter(
        (message, index, self) => index === self.findIndex((m) => m.messageId === message.messageId)
    );

    if (processedMessages?.length < 25 && processedMessages?.length < uniqueCRMMessages.length) {
        console.log('Some Messages deleted from meta for', lead.name);

        // Mark messages as deleted that are not in processedMessages
        lead.messages.forEach((message) => {
            if (!processedMessages.find((pm) => pm.messageId === message.messageId)) {
                // eslint-disable-next-line no-param-reassign
                message.isDeleted = true;
            }
        });

        // Notify admins about deleted messages
        await notifyDeletedMessagesToAdmin(lead, io);
    }
};

module.exports = {
    metaDeletedMessageAllart,
};
