import type { NextFunction, Request, Response } from "express";
export async function paginateMiddleware(req: Request, res: Response, next: NextFunction) {
    res.paginate = (data: unknown[], pagination) => {
        return res.status(200).json({
            data,
            pagination: {
                totalItems: pagination.totalItems,
                totalPages: pagination.totalPages,
                itemCount: pagination.itemCount,
                currentPage: pagination.currentPage,
            },
        });
    };
    return next();
}
