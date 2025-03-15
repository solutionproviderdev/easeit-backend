// Function to determine if a message is automated
const isAutomatedMessage = (message) => {
    const lowerCaseMessage = message.toLowerCase();

    // Add a pattern to detect the message "You can call [name] back within the next 7 days."
    // Also add a pattern for "Auto-detected outcome" and "added an Intake label"
    const automatedPattern =
        /(replied to|automated welcome message|you missed a call from|back within the next 7 days.|automated activity was created|add comment|assigned this|change or remove|visit messaging settings|you are responding|comment to|called you|you can call\s+([a-zA-Z]+\s?){1,3}\s+back within the next 7 days\.|auto-detected outcome.*added an intake label)/;

    return automatedPattern.test(lowerCaseMessage);
};

module.exports = {
    isAutomatedMessage,
};
