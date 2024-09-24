const MapData = require('../schemas/MapData');

// Controller function to get all divisions
const getDivisions = async (req, res) => {
    try {
        // Fetch all divisions from the map data collection
        const divisions = await MapData.find({}, 'division'); // Select only the 'division' field

        if (!divisions || divisions.length === 0) {
            return res.status(404).json({ message: 'No divisions found' });
        }

        // Respond with the list of divisions
        res.status(200).json(divisions);
    } catch (error) {
        console.error('Error fetching divisions:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Controller function to get districts by division ID
const getDistrictsByDivision = async (req, res) => {
    const { divisionId } = req.params;

    try {
        // Fetch the division based on the division ID, only return district names and IDs
        const division = await MapData.findById(divisionId).select('districts._id districts.name');

        if (!division) {
            return res.status(404).json({ message: 'Division not found' });
        }

        // Extract district IDs and names
        const districts = division.districts.map((district) => ({
            _id: district._id,
            name: district.name,
        }));

        // Respond with the list of district IDs and names
        res.status(200).json(districts);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Controller function to get areas by district ID
const getAreasByDistrict = async (req, res) => {
    const { districtId } = req.params;

    try {
        // Find the division that contains the district with the provided ID
        const division = await MapData.findOne({
            'districts._id': districtId,
        }).select('districts.$');

        if (!division || !division.districts || division.districts.length === 0) {
            return res.status(404).json({ message: 'District not found' });
        }

        // Extract the areas from the found district
        const district = division.districts[0];
        const areas = district.areas.map((area) => ({
            id: area._id,
            name: area.name,
        }));

        // Respond with the list of area IDs and names
        res.status(200).json(district.areas);
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Controller function to search through divisions, districts, and areas
const searchLocation = async (req, res) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(400).json({ msg: 'Keyword is required' });
    }

    try {
        // Fetch all matching divisions, districts, and areas
        const mapData = await MapData.find({
            $or: [
                { division: { $regex: keyword, $options: 'i' } }, // Match division names
                { 'districts.name': { $regex: keyword, $options: 'i' } }, // Match district names
                { 'districts.areas.name': { $regex: keyword, $options: 'i' } }, // Match area names
            ],
        });

        const results = [];

        // Iterate through the map data and build the result structure
        mapData.forEach((division) => {
            // If division matches the keyword, add it to the results
            if (new RegExp(keyword, 'i').test(division.division)) {
                results.push({
                    name: division.division,
                    _id: division._id,
                    path: division.division,
                    divisionId: division._id, // Division only has divisionId
                    type: 'division', // Type is division
                });
            }

            // Iterate over districts
            division.districts.forEach((district) => {
                // If district matches the keyword, add it to the results
                if (new RegExp(keyword, 'i').test(district.name)) {
                    results.push({
                        name: district.name,
                        _id: district._id,
                        path: `${division.division} > ${district.name}`,
                        divisionId: division._id, // Division ID for district
                        districtId: district._id, // District only has districtId
                        type: 'district', // Type is district
                    });
                }

                // Iterate over areas within districts
                district.areas.forEach((area) => {
                    // If area matches the keyword, add it to the results
                    if (new RegExp(keyword, 'i').test(area.name)) {
                        results.push({
                            name: area.name,
                            _id: area._id,
                            path: `${division.division} > ${district.name} > ${area.name}`,
                            divisionId: division._id, // Division ID for area
                            districtId: district._id, // District ID for area
                            type: 'area', // Type is area
                        });
                    }
                });
            });
        });

        // If no matches were found
        if (results.length === 0) {
            return res.status(404).json({ msg: 'No matching locations found' });
        }

        // Send the results back
        res.status(200).json(results);
    } catch (error) {
        console.error('Error searching locations:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

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
    getDivisions,
    getMapData,
    updateMapData,
    searchLocation,
    deleteMapData,
    getAreasByDistrict,
    getDistrictsByDivision,
    updateVisitCharge,
};
