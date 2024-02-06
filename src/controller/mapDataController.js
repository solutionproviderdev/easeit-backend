const MapData = require('../schemas/MapData');

const addMapData = async (req, res) => {
    try {
        const newMapData = new MapData(req.body);
        await newMapData.save();
        res.status(201).json({ message: 'Map data added successfully', mapData: newMapData });
    } catch (error) {
        res.status(500).json({ message: `Error adding map data: ${error.message}` });
    }
};

const getMapData = async (req, res) => {
    try {
        const mapData = await MapData.find();
        res.status(200).json(mapData);
    } catch (error) {
        res.status(500).json({ message: `Error retrieving map data: ${error.message}` });
    }
};

const updateMapData = async (req, res) => {
    const { id } = req.params;
    try {
        const updatedMapData = await MapData.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ message: 'Map data updated successfully', mapData: updatedMapData });
    } catch (error) {
        res.status(500).json({ message: `Error updating map data: ${error.message}` });
    }
};

const deleteMapData = async (req, res) => {
    const { id } = req.params;
    try {
        await MapData.findByIdAndDelete(id);
        res.status(200).json({ message: 'Map data deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: `Error deleting map data: ${error.message}` });
    }
};

const updateVisitCharge = async (req, res) => {
    const { areaId } = req.params;
    const { visitCharge } = req.body; // Assuming the new visit charge is sent in the request body

    try {
        // Find the document that contains the area with the specified ID and update its visitCharge
        const result = await MapData.updateOne(
            { 'districts.areas._id': areaId },
            { $set: { 'districts.$.areas.$[area].visitCharge': visitCharge } },
            { arrayFilters: [{ 'area._id': areaId }] }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Area not found or visit charge unchanged' });
        }

        res.status(200).json({ message: 'Visit charge updated successfully' });
    } catch (error) {
        res.status(500).json({ message: `Error updating visit charge: ${error.message}` });
    }
};

module.exports = {
    addMapData,
    getMapData,
    updateMapData,
    deleteMapData,
    updateVisitCharge,
};
