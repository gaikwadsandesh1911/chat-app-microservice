import { Request, Response, NextFunction} from 'express'

export type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export function asyncErrorHandler(asyncFun: AsyncHandler) {
    return (req: Request, res: Response, next: NextFunction) => {
        asyncFun(req, res, next).catch((err)=> next(err));
    }
};

/* 
    its higher order function used to eliminate repetative try-catch block and centrealize error handling.
    higher order func that takes another func as an args and or return another func as its result.

    if we directly call this fun. means we are calling immediately and not on provided route in express.
    thats why return(req, res, next).

    if function return rejected promise it will be send in next() and globalErrorHandler will catch it.

*/