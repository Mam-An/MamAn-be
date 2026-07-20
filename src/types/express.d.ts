import "express";
declare global {
    namespace Express {
        interface User {
            id: string;
            role?: string;
            email?: string;
        }
        interface Pagination {
            totalItems: number;
            totalPages: number;
            itemCount: number;
            currentPage: number;
        }
        interface Request {
            user?: User;
            id?: string | null;
        }
        interface Response {
            paginate: (data: unknown[], pagination: Pagination) => void;
        }
    }
}
export {};
