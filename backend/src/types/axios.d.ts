// Type declarations for axios (fallback when npm install fails)
declare module 'axios' {
  export interface AxiosRequestConfig {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    timeout?: number;
    data?: unknown;
    params?: Record<string, unknown>;
  }

  export interface AxiosResponse<T = unknown> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: AxiosRequestConfig;
  }

  export interface AxiosError<T = unknown> {
    response?: AxiosResponse<T>;
    request?: unknown;
    message: string;
    code?: string;
    config: AxiosRequestConfig;
  }

  export type AxiosInstance = {
    get: <T = unknown>(url: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
    post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
    defaults: {
      headers: Record<string, string>;
      timeout: number;
    };
  };

  export function create(config?: AxiosRequestConfig): AxiosInstance;
  export function get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  export function post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;

  export { AxiosResponse, AxiosError, AxiosRequestConfig };
  export default { create, get, post };
}
