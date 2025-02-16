const User = require('../../schemas/auth/UserSchema');
const Settings = require('../../schemas/SettingsSchema');
const Department = require('../../schemas/auth/DepartmentSchema');
const getCREPerformance = require('../../helpers/getCREPerformance');

// Helper to get (or create) the lead settings document
const getLeadSettingsDoc = async () => {
    let settings = await Settings.findOne({ name: 'lead' });
    if (!settings) {
        settings = new Settings({
            name: 'lead',
            settingsData: {
                global: {
                    performanceRangeDays: 7,
                    messageSeenTimeMin: 5,
                    messageReplyTimeMin: 10,
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
        const settings = await getLeadSettingsDoc();
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

        // Fetch all active CRE users in the CRE department.
        // We also populate the department details (e.g. departmentName).
        const creUsers = await User.find({
            departmentId: creDepartment._id,
            roleId: creRole._id,
        }).populate('departmentId', 'departmentName');

        // Build the CRE distribution array, merging manual override data if available.
        const creDistribution = await Promise.all(
            creUsers.map(async (user) => {
                const override = (settings.settingsData.creManualOverrides || []).find(
                    (o) => o.creId === user._id.toString()
                );

                // performance range days convart into last those days,
                const dateRange = new Date(
                    // eslint-disable-next-line no-unsafe-optional-chaining
                    Date.now() - globalSettings?.performanceRangeDays * 24 * 60 * 60 * 1000
                );

                const performances = await getCREPerformance(user._id, dateRange);
                const { assigned: assignCount, performance } = performances || {};

                return {
                    creId: user._id,
                    name: user.nickname || user.nameAsPerNID || 'Unknown',
                    avatar: user.profilePicture,
                    department: user.departmentId,
                    assign: assignCount,
                    performance,
                    manual: !!override,
                    manualLeadAssignRate: override ? override.manualLeadAssignRate : null,
                    manualLeadAssignEndTime: override ? override.manualLeadAssignEndTime : null,
                };
            })
        );

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
        const settings = await getLeadSettingsDoc();
        settings.settingsData.global = {
            ...settings.settingsData.global,
            ...global,
        };
        await settings.save();
        res.status(200).json(settings.settingsData.global);
    } catch (error) {
        console.error('Error updating global settings:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getManualOverrides = async (req, res) => {
    try {
        const settings = await getLeadSettingsDoc();
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
        const settings = await getLeadSettingsDoc();
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
        const settings = await getLeadSettingsDoc();
        const existing = (settings.settingsData.creManualOverrides || []).find(
            (o) => o.creId === creId
        );
        if (existing) {
            return res.status(400).json({ error: 'Manual override already exists for this CRE' });
        }
        const newOverride = {
            creId,
            manual: true,
            manualLeadAssignRate,
            manualLeadAssignEndTime,
        };
        settings.settingsData.creManualOverrides.push(newOverride);
        await settings.save();
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
        const settings = await getLeadSettingsDoc();
        const overrides = settings.settingsData.creManualOverrides || [];
        const index = overrides.findIndex((o) => o.creId === creId);
        if (index === -1) {
            return res.status(404).json({ error: 'Manual override not found' });
        }
        overrides[index] = {
            ...overrides[index],
            manualLeadAssignRate:
                manualLeadAssignRate !== undefined
                    ? manualLeadAssignRate
                    : overrides[index].manualLeadAssignRate,
            manualLeadAssignEndTime:
                manualLeadAssignEndTime !== undefined
                    ? manualLeadAssignEndTime
                    : overrides[index].manualLeadAssignEndTime,
        };
        settings.settingsData.creManualOverrides = overrides;
        await settings.save();
        res.status(200).json(overrides[index]);
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
        const settings = await getLeadSettingsDoc();
        settings.settingsData.creManualOverrides = (
            settings.settingsData.creManualOverrides || []
        ).filter((o) => o.creId !== creId);
        await settings.save();
        res.status(200).json({ message: 'Manual override deleted successfully' });
    } catch (error) {
        console.error('Error deleting manual override:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
