export interface JSONResponse {
    success: boolean;
    statusCode: number;
    result: any;
    errorMessage: string;
}
export declare class JSONRequest {
    private static send;
    static get(url: string, headers?: any): Promise<JSONResponse>;
    static delete(url: string, headers?: any): Promise<JSONResponse>;
    static post(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
    static put(url: string, jsonBody: string, headers?: any): Promise<JSONResponse>;
}
