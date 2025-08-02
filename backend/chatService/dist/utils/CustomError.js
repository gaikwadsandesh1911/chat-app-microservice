"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomError = void 0;
class CustomError extends Error {
    constructor(message, statusCode) {
        // setting message in Error class constructor. And on error.message property we get that error message
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? "fail" : "error";
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor); // node specific not work for browser. tells where the error is actually occured
    }
    ;
}
exports.CustomError = CustomError;
// const err = new CustomError("something went wrong", 401)
/*  const err = new Error("something went wrong");
    by default err obj has got name, message and stack property
    
    we create additional status, statusCode, isOperation property
    
    so, if we create error using const err = new CustomError(),
    then this instance will have err.isOperational = true
    so we can create our logic acccordingly, because in app we will have other errors also, like mongodb error, programming error.
*/
