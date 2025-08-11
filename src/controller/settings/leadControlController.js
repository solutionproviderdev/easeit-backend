/* eslint-disable no-restricted-syntax */
const User = require('../../schemas/auth/UserSchema');
const Settings = require('../../schemas/SettingsSchema');
const Department = require('../../schemas/auth/DepartmentSchema');
const getCREPerformance = require('../../helpers/getCREPerformance');

exports.getLeadSettingsDoc = async () => {
    let settings = await Settings.findOne({ name: 'lead' });
    if (!settings) {
        settings = new Settings({
            name: 'lead',
            settingsData: {
                global: {
                    performanceRangeDays: '2025-02-01',
                    messageSeenTimeMin: 8,
                    messageReplyTimeMin: 12,
                },
                creManualOverrides: [],
            },
        });
        await settings.save();
    }
    return settings;
};

exports.getLeadControl = async (req, res) => {
    try {
        // Retrieve the global settings
        const settings = await exports.getLeadSettingsDoc();
        if (!settings) {
            return res.status(404).json({ error: 'Lead control settings not found' });
        }
        const globalSettings = settings.settingsData.global;

        // Fetch the CRE department using its name.
        const creDepartment = await Department.findOne({ departmentName: 'CRE' });
        if (!creDepartment) {
            return res.status(404).json({ error: 'CRE department not found' });
        }

        // Get the CRE role from the department's roles array.
        const creRole = creDepartment.roles.find((role) => role.roleName === 'CRE');
        if (!creRole) {
            return res.status(404).json({ error: 'CRE role not found' });
        }

        // Fetch all active CRE users in the CRE department (with populated department details).
        const creUsers = await User.find({
            departmentId: creDepartment._id,
            roleId: creRole._id,
        }).populate('departmentId', 'departmentName');

        // Build the initial CRE distribution array.
        const creDistribution = await Promise.all(
            creUsers.map(async (user) => {
                const override = (settings.settingsData.creManualOverrides || []).find(
                    (o) => o.creId === user._id.toString()
                );
                // For performance, we now expect global.performanceRangeDays is
                // used as a date string or converted appropriately.
                const dateRange = new Date(globalSettings.performanceRangeDays);
                const performances = await getCREPerformance(user._id, dateRange);
                const { assigned: assignCount, performance } = performances || {};
                return {
                    creId: user._id,
                    name: user.nickname || user.nameAsPerNID || 'Unknown',
                    avatar: user.profilePicture,
                    department: user.departmentId,
                    assign: assignCount,
                    performance,
                    active: user.status === 'Active',
                    manual: !!override,
                    manualLeadAssignRate: override ? override.manualLeadAssignRate : null,
                    manualLeadAssignEndTime: override ? override.manualLeadAssignEndTime : null,
                };
            })
        );

        // Adjust the lead assign rate to ensure the total equals 100%.
        // 1. For CREs with manual overrides, sum up their manual rates.
        const manualOverrides = creDistribution.filter(
            (cre) => cre.manual && cre.manualLeadAssignRate
        );
        const totalManualRate = manualOverrides.reduce(
            (sum, cre) =>
                // Remove any "%" symbol and convert to number.
                sum + parseFloat(cre.manualLeadAssignRate.replace('%', '')),
            0
        );

        // 2. For non-manual CREs, sum their performance values.
        const nonManualCREs = creDistribution.filter((cre) => !cre.manual);
        const totalPerformanceNonManual = nonManualCREs.reduce(
            (sum, cre) => sum + cre.performance,
            0
        );

        // 3. For each CRE, calculate and assign the final leadAssignRate.
        for (const cre of creDistribution) {
            if (cre.manual && cre.manualLeadAssignRate) {
                // Use the manual value as is.
                cre.leadAssignRate = `${parseFloat(
                    cre.manualLeadAssignRate.replace('%', '')
                ).toFixed(2)}%`;
            } else {
                // For non-manual, distribute the remaining percentage proportionally.
                const adjustedRate =
                    totalPerformanceNonManual > 0
                        ? (cre.performance / totalPerformanceNonManual) * (100 - totalManualRate)
                        : 0;
                cre.leadAssignRate = `${adjustedRate.toFixed(2)}%`;
            }
        }

        // Return the global settings and the adjusted CRE distribution.
        res.status(200).json({
            global: globalSettings,
            creDistribution,
        });
    } catch (error) {
        console.error('Error getting lead control settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateGlobalSettings = async (req, res) => {
    try {
        const { global } = req.body;
        if (!global) {
            return res.status(400).json({ error: 'Global settings are required' });
        }

        const oldSettings = await exports.getLeadSettingsDoc();
        const { global: oldGlobal } = oldSettings.settingsData;

        // Use findOneAndUpdate to update (or create) the settings document with name "lead"
        const settings = await Settings.findOneAndUpdate(
            { name: 'lead' },
            { $set: { 'settingsData.global': { ...oldGlobal, ...global } } },
            { new: true, upsert: true }
        );

        res.status(200).json(settings.settingsData.global);
    } catch (error) {
        console.error('Error updating global settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getManualOverrides = async (req, res) => {
    try {
        const settings = await exports.getLeadSettingsDoc();
        const overrides = settings.settingsData.creManualOverrides || [];
        res.status(200).json(overrides);
    } catch (error) {
        console.error('Error getting manual overrides:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getManualOverrideById = async (req, res) => {
    try {
        const { creId } = req.params;
        if (!creId) {
            return res.status(400).json({ error: 'creId is required' });
        }
        const settings = await exports.getLeadSettingsDoc();
        const override = (settings.settingsData.creManualOverrides || []).find(
            (o) => o.creId === creId
        );
        if (!override) {
            return res.status(404).json({ error: 'Manual override not found' });
        }
        res.status(200).json(override);
    } catch (error) {
        console.error('Error getting manual override by id:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.createManualOverride = async (req, res) => {
    try {
        const { creId, manualLeadAssignRate, manualLeadAssignEndTime } = req.body;
        if (!creId) {
            return res.status(400).json({ error: 'creId is required' });
        }
        const newOverride = {
            creId,
            manual: true,
            manualLeadAssignRate,
            manualLeadAssignEndTime,
        };

        // Use findOneAndUpdate to push the new override only if there is no override for this creId
        const settings = await Settings.findOneAndUpdate(
            {
                name: 'lead',
                'settingsData.creManualOverrides.creId': { $ne: creId },
            },
            {
                $push: { 'settingsData.creManualOverrides': newOverride },
            },
            { new: true }
        );

        if (!settings) {
            return res.status(400).json({ error: 'Manual override already exists for this CRE' });
        }

        res.status(201).json(newOverride);
    } catch (error) {
        console.error('Error creating manual override:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateManualOverride = async (req, res) => {
    try {
        const { creId } = req.params;
        const { manualLeadAssignRate, manualLeadAssignEndTime } = req.body;
        if (!creId) {
            return res.status(400).json({ error: 'creId is required' });
        }

        // Build the update object dynamically so that we update only if the values are provided.
        const updateData = {};
        if (manualLeadAssignRate !== undefined) {
            updateData['settingsData.creManualOverrides.$.manualLeadAssignRate'] =
                manualLeadAssignRate;
        }
        if (manualLeadAssignEndTime !== undefined) {
            updateData['settingsData.creManualOverrides.$.manualLeadAssignEndTime'] =
                manualLeadAssignEndTime;
        }

        // Use findOneAndUpdate with an array filter to update the matching manual override element.
        const settings = await Settings.findOneAndUpdate(
            { name: 'lead', 'settingsData.creManualOverrides.creId': creId },
            { $set: updateData },
            { new: true }
        );

        if (!settings) {
            return res.status(404).json({ error: 'Manual override not found' });
        }

        // Find the updated override in the array
        const updatedOverride = settings.settingsData.creManualOverrides.find(
            (o) => o.creId === creId
        );

        res.status(200).json(updatedOverride);
    } catch (error) {
        console.error('Error updating manual override:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.deleteManualOverride = async (req, res) => {
    try {
        const { creId } = req.params;
        if (!creId) {
            return res.status(400).json({ error: 'creId is required' });
        }
        // Use updateOne with $pull to remove the manual override for the given creId
        const result = await Settings.updateOne(
            { name: 'lead', 'settingsData.creManualOverrides.creId': creId },
            { $pull: { 'settingsData.creManualOverrides': { creId } } }
        );
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'Manual override not found' });
        }
        res.status(200).json({ message: 'Manual override deleted successfully' });
    } catch (error) {
        console.error('Error deleting manual override:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Controller to update the auto message settings in the lead control configuration.
 * Route: PUT /lead/autoMessage
 * Expects in req.body:
 * {
 *   autoMessage: {
 *     enabled: <boolean>,
 *     message: <string>
 *     delayHours: <number>
 *   }
 * }
 */

exports.updateAutoMessage = async (req, res) => {
    try {
        const { autoMessage } = req.body;
        console.log('ai autoMessage----->', autoMessage);
        // Validate the input: ensure enabled is boolean, message is a non-empty string,
        // and delayHours is a number between 1 and 23.
        if (
            typeof autoMessage?.enabled !== 'boolean' ||
            !autoMessage.message ||
            typeof autoMessage.message !== 'string' ||
            typeof autoMessage.delayHours !== 'number' ||
            autoMessage.delayHours < 1 ||
            autoMessage.delayHours > 23
        ) {
            return res.status(400).json({ error: 'Invalid autoMessage data provided' });
        }

        // Use findOneAndUpdate with upsert to update (or create)
        //  the settings document with name 'lead'
        const updatedSettings = await Settings.findOneAndUpdate(
            { name: 'lead' },
            {
                $set: {
                    'settingsData.global.autoMessage': {
                        enabled: autoMessage.enabled,
                        message: autoMessage.message,
                        delayHours: autoMessage.delayHours,
                    },
                },
            },
            { new: true, upsert: true }
        );

        if (!updatedSettings) {
            return res.status(404).json({ error: 'Settings not found' });
        }

        // Return the updated autoMessage settings
        res.status(200).json(updatedSettings.settingsData.global.autoMessage);
    } catch (error) {
        console.error('Error updating auto message:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
