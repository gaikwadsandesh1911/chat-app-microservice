import { NextFunction, Request, Response } from "express";
import { CustomError } from "./CustomError.js";

// Type for both CustomError and built-in Error
type AppError = CustomError & Error;

const devErrors = (res: Response, err: AppError): Response => {
    return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        stack: err.stack,
        error: err
    })
};

// -------------------------------------------------------------------------------------------------

const prodErrors = (res: Response, err: AppError): Response => {
    //  if error is created using new CustomError(), then it has isOperational property.
    if(err.isOperational){
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }else{
        // sending general message, which are not handled according to error.
        return res.status(500).json({
            status: "error",
            message: "something went wrong! please try again later"
        })
    }
};

// -------------------------------------------------------------------------------------------------
// anywhere in the program if next(err) fun has an args... 
// then it's an error and will be catch at globalErrorHandlingFunction
const globalErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
    // creating statusCode property on err obj and set value from CustomError()
    err.statusCode = err.statusCode || 500;
    // creating status property on err obj and set value from CustomError()
    err.status = err.status || "error"

    if(process.env.NODE_ENV == 'development'){
        devErrors(res, err);
    }
    else if(process.env.NODE_ENV == 'production'){
        prodErrors(res, err);
    }

};

// -------------------------------------------------------------------------------------------------

export {globalErrorHandler};