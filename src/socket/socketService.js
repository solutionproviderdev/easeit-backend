// socketService.js
let ioInstance = null;

/**
 * Set the io instance.
 * @param {SocketIO.Server} io
 */
const setIO = (io) => {
    ioInstance = io;
    console.log('Socket.io instance set');
};

/**
 * Get the io instance.
 * @returns {SocketIO.Server}
 */
const getIO = () => {
    if (!ioInstance) {
        throw new Error('Socket.io instance not set');
    }
    return ioInstance;
};

module.exports = { setIO, getIO };
