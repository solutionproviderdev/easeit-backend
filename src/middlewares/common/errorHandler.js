const createHttpError = require('http-errors');

// 404 Not Found Handler
function notFoundHandler(req, res, next) {
    const errorMessage = `The requested resource '${req.originalUrl}' was not found on this server.`;
    const errorDetails = {
        status: 404,
        error: "Not Found",
        message: errorMessage,
        hint: "Please check the URL and try again.",
        timestamp: new Date().toISOString(),
    };
    next(createHttpError(404, errorDetails));
}


// default error handler
const errorHandler = (err, req, res, next) => {
    res.locals.error = process.env.NODE_ENV === 'development' ? err : { message: err };

    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json(res.locals.error);
};

module.exports = {
    notFoundHandler,
    errorHandler,
};
