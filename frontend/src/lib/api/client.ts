import axios, { AxiosInstance, AxiosError } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            // Handle unauthorized - simple redirect for now
             // window.location.href = '/login';
             // Commented out to prevent loops or unwanted behavior during dev
             console.warn('Unauthorized access');
          }
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    const message = (error.response?.data as any)?.message || error.message || 'An error occurred';
    return new Error(message);
  }

  // Generic methods
  public get<T>(url: string, config = {}) {
      return this.client.get<T>(url, config);
  }

  public post<T>(url: string, data = {}, config = {}) {
      return this.client.post<T>(url, data, config);
  }

  public put<T>(url: string, data = {}, config = {}) {
      return this.client.put<T>(url, data, config);
  }

  public patch<T>(url: string, data = {}, config = {}) {
      return this.client.patch<T>(url, data, config);
  }

  public delete<T>(url: string, config = {}) {
      return this.client.delete<T>(url, config);
  }
}

export const api = new ApiClient();
