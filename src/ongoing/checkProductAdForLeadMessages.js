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

        // Cache for product ads: key is product name in lowercase, value is ProductAd document (or null if not found)
        const productAdCache = new Map();

        // Regex pattern to capture:
        // Group 1: Lead's first name (unused here)
        // Group 2: Product name (between "with " and " Solutions?")
        const pattern =
            /^Hi\s+(.*?)!\s+Please let us know how we can help you\. with\s+(.*?)\s+Solutions\?$/i;

        for (const lead of leads) {
            let leadUpdated = false;

            if (!Array.isArray(lead.messages)) continue;

            // Get lead's pageId; if missing, skip this lead
            const leadPageId = (lead.pageInfo && lead.pageInfo.pageId) || null;
            if (!leadPageId) continue;

            // Process each message until a relation is added
            for (const msg of lead.messages) {
                const content = msg.content || '';
                const match = pattern.exec(content);
                if (!match) continue;

                const extractedProductName = match[2].trim();
                const key = extractedProductName.toLowerCase();

                // Check cache first
                let productAd = productAdCache.get(key);
                if (productAd === undefined) {
                    productAd = await ProductAd.findOne({
                        name: { $regex: `^${extractedProductName}$`, $options: 'i' },
                    });
                    productAdCache.set(key, productAd);
                }

                if (!productAd) continue;

                // Check if any image in the product ad has a matching pageId
                const pageIdMatch = productAd.images.some((img) => img.pageId === leadPageId);
                if (!pageIdMatch) continue;

                // Check if the relation already exists
                const productAdIdStr = productAd._id.toString();
                const leadProductAds = (lead.productAds || []).map((id) => id.toString());
                if (!leadProductAds.includes(productAdIdStr)) {
                    await Lead.updateOne(
                        { _id: lead._id },
                        { $addToSet: { productAds: productAd._id } }
                    );
                    leadUpdated = true;
                    // Once a relation is created for this lead, exit the inner loop.
                    break;
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
