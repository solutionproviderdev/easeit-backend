const express = require('express');

const ProjectStagerouter = express.Router();

const {
    createProjectStage,
    getAllProjectStages,
    getProjectStage,
    updateProjectStage,
    deleteProjectStage,
    updateStageDetails,
} = require('../controller/projectStageController');

// Create a new ProjectStage document (no URL params)
ProjectStagerouter.post('/', createProjectStage);

// Get all ProjectStage documents (no URL params)
ProjectStagerouter.get('/', getAllProjectStages);

// Get a specific ProjectStage document by its id
ProjectStagerouter.get('/:id', getProjectStage);

// Update a specific ProjectStage document by its id
ProjectStagerouter.put('/:id', updateProjectStage);

// Delete a specific ProjectStage document by its id
ProjectStagerouter.delete('/:id', deleteProjectStage);

// Update only the stageDetails field of a specific ProjectStage document
ProjectStagerouter.patch('/:id/stagedetails', updateStageDetails);

module.exports = ProjectStagerouter;
