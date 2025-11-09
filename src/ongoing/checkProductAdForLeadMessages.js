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
        const cursor = Lead.find(
            {
                'messages.0': { $exists: true },
                'pageInfo.pageId': { $exists: true, $ne: null },
            },
            { messages: 1, productAds: 1, pageInfo: 1 }
        )
            .lean()
            .cursor();

        const productAdCache = new Map();

        const pattern =
            /^Hi\s+(.*?)!\s+Please let us know how we can help you\. with\s+(.*?)\s+Solutions\?$/i;

        let totalPatternMatches = 0;
        let totalMissingProductAds = 0;
        const productNameCount = new Map();

        for await (const lead of cursor) {
            let relationCreated = false;
            const messages = Array.isArray(lead.messages) ? lead.messages : [];
            const leadPageId = (lead.pageInfo && lead.pageInfo.pageId) || null;
            if (!leadPageId || messages.length === 0) continue;

            for (const msg of messages) {
                const content = msg.content || '';
                const match = pattern.exec(content);
                if (!match) continue;

                totalPatternMatches += 1;
                const extractedProductName = match[2].trim();
                const key = extractedProductName.toLowerCase();
                productNameCount.set(key, (productNameCount.get(key) || 0) + 1);

                let productAd = productAdCache.get(key);
                if (productAd === undefined) {
                    productAd = await ProductAd.findOne({
                        name: { $regex: `^${extractedProductName}$`, $options: 'i' },
                    })
                        .lean()
                        .exec();
                    productAdCache.set(key, productAd);
                }

                if (!productAd) {
                    totalMissingProductAds += 1;
                    continue;
                }

                const pageIdMatch = Array.isArray(productAd.images)
                    && productAd.images.some((img) => img.pageId === leadPageId);
                if (!pageIdMatch) continue;

                const productAdIdStr = productAd._id.toString();
                const leadProductAds = (lead.productAds || []).map((id) => id.toString());
                if (!leadProductAds.includes(productAdIdStr)) {
                    await Lead.updateOne(
                        { _id: lead._id },
                        { $addToSet: { productAds: productAd._id } }
                    );
                    relationCreated = true;
                    break;
                }
            }

            if (relationCreated) {
                // relation created for this lead
            }
        }

        return {
            success: true,
            totalPatternMatches,
            totalMissingProductAds,
        };
    } catch (error) {
        console.error('Error checking product ads:', error);
        return { success: false, error: error.message };
    }
}

module.exports = checkProductAdForLeadMessages;
