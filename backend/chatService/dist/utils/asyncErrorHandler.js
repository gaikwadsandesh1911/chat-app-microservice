"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncErrorHandler = asyncErrorHandler;
function asyncErrorHandler(asyncFun) {
    return (req, res, next) => {
        asyncFun(req, res, next).catch((err) => next(err));
    };
}
;
/*
    its higher order function used to eliminate repetative try-catch block and centrealize error handling.
    higher order func that takes another func as an args and or return another func as its result.

    if we directly call this fun. means we are calling immediately and not on provided route in express.
    thats why return(req, res, next).

    if function return rejected promise it will be send in next() and globalErrorHandler will catch it.

*/ 
