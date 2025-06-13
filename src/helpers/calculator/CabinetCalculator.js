function calculateBoard1Area(components) {
    const {
 topPanel, bottomPanel, sidePanel, shelfArea, partitionArea, drawerArea 
} = components;

    return (
        (topPanel.area +
            bottomPanel.area +
            sidePanel.area +
            shelfArea +
            partitionArea +
            drawerArea) /
        144
    );
}

const Board = require('../../schemas/products/composite-materials/BoardSchema');
const Glass = require('../../schemas/products/composite-materials/GlassSchema');

async function calculateCabinetComponents(input) {
    const {
        height,
        width,
        depth,
        shelfCount,
        includeSkirting,
        glassFrontShutterCount,
        drawerHeights,
        selectedBoardIds, // { board1Id, board2Id, board3Id }
        selectedGlassId,
    } = input;

    const mmToInch = (mm) => mm / 25.4;

    // Fetch boards and glass directly using their IDs
    const [board1, board2, board3, selectedGlass] = await Promise.all([
        Board.findById(selectedBoardIds.board1Id),
        Board.findById(selectedBoardIds.board2Id),
        Board.findById(selectedBoardIds.board3Id),
        Glass.findById(selectedGlassId),
    ]);

    if (!board1 || !board2 || !board3) {
        throw new Error('One or more boards not found');
    }

    if (glassFrontShutterCount > 0 && !selectedGlass) {
        throw new Error('Glass material not found');
    }

    const frontThickness = board2.thickness.value;
    const bodyThickness = board1.thickness.value;
    const backThickness = board3.thickness.value;

    const frontThInch = mmToInch(frontThickness);
    const bodyThInch = mmToInch(bodyThickness);
    const backThInch = mmToInch(backThickness);

    const adjustedDepth = depth - frontThInch - backThInch;

    const topPanel = { width, depth: adjustedDepth, area: width * adjustedDepth };
    const bottomPanel = {
        width: width - bodyThInch * 2,
        depth: adjustedDepth,
        area: (width - bodyThInch * 2) * adjustedDepth,
    };
    const sidePanel = {
        height: height - bodyThInch,
        depth: adjustedDepth,
        area: (height - bodyThInch) * adjustedDepth * 2,
    };
    const backPanel = {
        width,
        height,
        area: width * height,
    };

    const shelfWidth = width - bodyThInch * 2;
    const shelfArea = shelfCount * shelfWidth * adjustedDepth;
    const partitionCount = Math.ceil(width / 32 - 1);
    const partitionArea = partitionCount * height * adjustedDepth;
    const skirtingArea = includeSkirting ? (width - 2 * bodyThInch) * 2 : 0;

    let glassFrontShutterArea = 0;
    if (glassFrontShutterCount > 0) {
        const singleShutterArea = height * 12;
        glassFrontShutterArea = singleShutterArea * glassFrontShutterCount;
    }

    let drawerArea = 0;
    let drawerFrontArea = 0;
    const drawerDetails = [];

    drawerHeights.forEach((drawer, index) => {
        if (drawer.height > 0 && drawer.width > 0) {
            const drawerBottom = adjustedDepth * (drawer.width - 2);
            const drawerSides = (adjustedDepth - 1 - bodyThInch) * (drawer.height - 2) * 2;
            const drawerBack = (drawer.width - 2) * (drawer.height - 2);
            const drawerBodyArea = drawerBottom + drawerSides + drawerBack;
            const drawerFrontAreaSingle = drawer.width * drawer.height;

            drawerArea += drawerBodyArea;
            drawerFrontArea += drawerFrontAreaSingle;

            drawerDetails.push({
                index: index + 1,
                height: drawer.height,
                width: drawer.width,
                bodyArea: drawerBodyArea,
                frontArea: drawerFrontAreaSingle,
            });
        }
    });

    const board1Area = calculateBoard1Area({
        topPanel,
        bottomPanel,
        sidePanel,
        shelfArea,
        partitionArea,
        drawerArea,
    });

    const board2Area = (drawerFrontArea + (width * height - glassFrontShutterArea)) / 144;

    const board3Area = (backPanel.area + skirtingArea) / 144;
    const glassArea = glassFrontShutterArea / 144;

    const wasteFactor = 1.25;
    const additionalFactor = 1.1;

    const board1Total = board1Area * wasteFactor * additionalFactor;
    const board2Total = board2Area * wasteFactor * additionalFactor;
    const board3Total = board3Area * wasteFactor * additionalFactor;
    const glassTotal = glassArea * wasteFactor;

    const board1Cost = board1Total * board1.sqftPrice;
    const board2Cost = board2Total * board2.sqftPrice;
    const board3Cost = board3Total * board3.sqftPrice;
    const glassCost = glassTotal * (selectedGlass?.sqftPrice || 0);
    const totalCost = board1Cost + board2Cost + board3Cost + glassCost;

    return {
        components: {
            topPanel,
            bottomPanel,
            sidePanel,
            backPanel,
            shelfCount,
            shelfWidth,
            shelfArea,
            partitionCount,
            partitionArea,
            skirtingArea,
            glassFrontShutterCount,
            glassFrontShutterArea,
            drawerCount: drawerHeights.length,
            drawerHeights,
            drawerArea,
            drawerFrontArea,
            drawerDetails,
        },
        materials: {
            board1Area,
            board2Area,
            board3Area,
            glassArea,
            board1Total,
            board2Total,
            board3Total,
            glassTotal,
        },
        costs: {
            board1Cost,
            board2Cost,
            board3Cost,
            glassCost,
            totalCost,
        },
        boardDetails: {
            board1: {
                name: board1.name,
                thickness: board1.thickness.value,
                price: board1.sqftPrice,
            },
            board2: {
                name: board2.name,
                thickness: board2.thickness.value,
                price: board2.sqftPrice,
            },
            board3: {
                name: board3.name,
                thickness: board3.thickness.value,
                price: board3.sqftPrice,
            },
        },
    };
}

module.exports = {
    calculateCabinetComponents,
    calculateBoard1Area, // Export the function if needed elsewhere
};
