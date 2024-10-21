const permissionsData = [
    {
        resource: 'Dashboard',
        actions: [
            { name: 'CRE', allowed: false },
            { name: 'Sales', allowed: false },
            { name: 'Admin', allowed: false },
        ],
    },
    {
        resource: 'CRE - Lead',
        actions: [
            { name: 'Lead Center', allowed: false },
            { name: 'Lead Management', allowed: false },
            { name: 'Follow Up', allowed: false },
        ],
    },
    {
        resource: 'User',
        actions: [
            { name: 'All Users', allowed: false },
            { name: 'User Profile', allowed: false },
            { name: 'Departments', allowed: false },
            { name: 'Roles', allowed: false },
        ],
    },
    {
        resource: 'Meetings',
        actions: [
            { name: 'Daily Meetings', allowed: false },
            { name: 'Meeting History', allowed: false },
        ],
    },
];

module.exports = permissionsData;
