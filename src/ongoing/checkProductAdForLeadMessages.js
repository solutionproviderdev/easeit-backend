/* eslint-disable no-lonely-if */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */

const Lead = require('../schemas/LeadsSchema');
const ProductAd = require('../schemas/ProductAdSchema');

async function checkProductAdForLeadMessages() {
    try {
        // Fetch all leads from the database
        const leads = await Lead.find({});

        // Regex pattern:
        // ^Hi\s+(.*?)!\s+Please let us know how we can help you\. with\s+(.*?)\s+Solutions\?$
        // Group 1: Lead's first name
        // Group 2: Product name
        const pattern =
            /^Hi\s+(.*?)!\s+Please let us know how we can help you\. with\s+(.*?)\s+Solutions\?$/i;

        for (const lead of leads) {
            let leadUpdated = false; // Flag to track if relation was created/linked for this lead

            if (Array.isArray(lead.messages)) {
                for (const msg of lead.messages) {
                    const content = msg.content || '';
                    const match = pattern.exec(content);
                    if (match) {
                        const extractedProductName = match[2].trim();

                        // Look up the product ad by name (case-insensitive exact match)
                        const productAd = await ProductAd.findOne({
                            name: { $regex: `^${extractedProductName}$`, $options: 'i' },
                        });

                        // Get the lead's pageId
                        const leadPageId =
                            lead.pageInfo && lead.pageInfo.pageId ? lead.pageInfo.pageId : null;

                        if (productAd && leadPageId) {
                            // Check if any image in productAd has a matching pageId
                            const pageIdMatch = productAd.images.some(
                                (img) => img.pageId === leadPageId
                            );
                            if (pageIdMatch) {
                                const productAdIdStr = productAd._id.toString();
                                const leadProductAds = (lead.productAds || []).map((id) =>
                                    id.toString()
                                );
                                if (!leadProductAds.includes(productAdIdStr)) {
                                    // Add the product ad relation if it doesn't exist
                                    await Lead.updateOne(
                                        { _id: lead._id },
                                        { $addToSet: { productAds: productAd._id } }
                                    );
                                    leadUpdated = true;
                                }
                            }
                        }
                    }
                }
            }
            if (leadUpdated) {
                console.log(`Lead ${lead._id}: Product ad relation created/linked.`);
            }
        }
    } catch (error) {
        console.error('Error checking product ads:', error);
    }
}

module.exports = checkProductAdForLeadMessages;
