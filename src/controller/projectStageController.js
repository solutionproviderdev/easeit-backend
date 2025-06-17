const ProjectStage = require('../schemas/ProjectStageSchema');

// Create a new ProjectStage document (expects req.body with the project stage data)
const createProjectStage = async (req, res) => {
    try {
        const stageData = req.body;
        const newProjectStage = new ProjectStage(stageData);
        await newProjectStage.save();

        res.status(201).json({
            success: true,
            projectStage: newProjectStage,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get all ProjectStage documents
const getAllProjectStages = async (req, res) => {
    try {
        const projectStages = await ProjectStage.find();
        res.status(200).json({
            success: true,
            projectStage: projectStages,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get a specific ProjectStage document by its id
const getProjectStage = async (req, res) => {
    try {
        const { id } = req.params;
        const projectStage = await ProjectStage.findById(id);
        if (!projectStage) {
            return res.status(404).json({
                success: false,
                message: 'ProjectStage not found',
            });
        }
        res.status(200).json({
            success: true,
            projectStage,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update a specific ProjectStage document by its id
const updateProjectStage = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const projectStage = await ProjectStage.findByIdAndUpdate(id, updateData, { new: true });
        if (!projectStage) {
            return res.status(404).json({
                success: false,
                message: 'ProjectStage not found',
            });
        }
        res.status(200).json({
            success: true,
            projectStage,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Delete a ProjectStage document by its id
const deleteProjectStage = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ProjectStage.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'ProjectStage not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'ProjectStage deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update only the stageDetails field of a specific ProjectStage document
const updateStageDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { stageDetails } = req.body;
        const projectStage = await ProjectStage.findById(id);
        if (!projectStage) {
            return res.status(404).json({
                success: false,
                message: 'ProjectStage not found',
            });
        }
        projectStage.stageDetails = {
            ...projectStage.stageDetails.toObject(),
            ...stageDetails,
        };
        await projectStage.save();
        res.status(200).json({
            success: true,
            projectStage,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    createProjectStage,
    getAllProjectStages,
    getProjectStage,
    updateProjectStage,
    deleteProjectStage,
    updateStageDetails,
};
