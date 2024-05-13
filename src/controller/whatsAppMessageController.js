const sendTemplateToLead = (req, res) => {
    // console.log(req.body);
    res.status(200).json({
        message: 'Template sent to lead',
    });
};

module.exports = {
    sendTemplateToLead,
};
