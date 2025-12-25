#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

async function main() {
    // Load environment variables
    try {
        // Try loading .env from project root
        // Adjust path if needed
        require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
    } catch (e) {
        // ignore if dotenv not available
    }

    const connStr = process.env.MONGO_CONNECTION_STRING;
    if (!connStr) {
        console.error('MONGO_CONNECTION_STRING not set. Please set it in .env or environment.');
        process.exit(1);
    }

    await mongoose.connect(connStr, {});
    // Register dependent models used in Product population
    require('../src/schemas/products/SeriseSchema');
    require('../src/schemas/products/materials/SurfaceSchema');
    require('../src/schemas/products/materials/HardwareSchema');
    require('../src/schemas/products/composite-materials/BoardSchema');
    require('../src/schemas/products/composite-materials/EdgingSchema');
    require('../src/schemas/products/materials/BaseMaterialSchema');
    require('../src/schemas/products/materials/BrandSchema');
    require('../src/schemas/products/materials/SurfaceFinishSchema');
    require('../src/schemas/products/materials/ThicknessSchema');

    const Product = require('../src/schemas/products/ProductSchema');

    const products = await Product.find({}).limit(10000);

    const lines = [];
    lines.push('# Products Pricing by Series');
    lines.push('');
    lines.push('| Product | Series | Price per Sq Ft |');
    lines.push('|---|---|---|');

    for (const p of products) {
        const productName = p.name || String(p._id);
        const specs = Array.isArray(p.specifications) ? p.specifications : [];
        if (specs.length === 0) {
            lines.push(`| ${escapePipe(productName)} |  |  |`);
        } else {
            for (const spec of specs) {
                const seriesObj = spec.series || {};
                const price = spec.pricePerSqFt != null ? Number(spec.pricePerSqFt) : '';
                const seriesName =                    seriesObj?.name || seriesObj?.title || seriesObj?.seriesName || '';
                lines.push(`| ${escapePipe(productName)} | ${escapePipe(seriesName)} | ${price} |`);
            }
        }
    }

    const outPath = process.env.OUTPUT_MD || path.join(process.cwd(), 'products.md');
    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`Markdown exported to ${outPath}`);
    await mongoose.disconnect();
}

function escapePipe(text) {
    if (text == null) return '';
    return String(text).replace(/\|/g, '\\|');
}

main().catch(async (err) => {
    console.error('Export failed:', err);
    try {
        await mongoose.disconnect();
    } catch (e) {}
    process.exit(1);
});
