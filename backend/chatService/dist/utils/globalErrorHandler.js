"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = void 0;
const devErrors = (res, err) => {
    return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        stack: err.stack,
        error: err
    });
};
// -------------------------------------------------------------------------------------------------
const prodErrors = (res, err) => {
    //  if error is created using new CustomError(), then it has isOperational property.
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    }
    else {
        // sending general message, which are not handled according to error.
        return res.status(500).json({
            status: "error",
            message: "something went wrong! please try again later"
        });
    }
};
// -------------------------------------------------------------------------------------------------
// anywhere in the program if next(err) fun has an args... 
// then it's an error and will be catch at globalErrorHandlingFunction
const globalErrorHandler = (err, req, res, next) => {
    // creating statusCode property on err obj and set value from CustomError()
    err.statusCode = err.statusCode || 500;
    // creating status property on err obj and set value from CustomError()
    err.status = err.status || "error";
    if (process.env.NODE_ENV == 'development') {
        devErrors(res, err);
    }
    else if (process.env.NODE_ENV == 'production') {
        prodErrors(res, err);
    }
};
exports.globalErrorHandler = globalErrorHandler;
