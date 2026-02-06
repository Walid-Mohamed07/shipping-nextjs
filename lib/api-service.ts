/**
 * Centralized API Service for connecting to NestJS backend
 * Handles all HTTP requests (GET, POST, PUT, DELETE) with JSON handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface RequestOptions {
  headers?: HeadersInit;
  body?: any;
  params?: Record<string, string | number | boolean>;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(endpoint, API_BASE_URL);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }
  
  return url.toString();
}

/**
 * Generic fetch handler with error handling
 */
async function fetchHandler<T>(
  url: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    const data = isJson ? await response.json() : await response.text();
    
    if (!response.ok) {
      return {
        error: data?.message || data || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
    }
    
    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      status: 0,
    };
  }
}

/**
 * GET request
 * @param endpoint - API endpoint path
 * @param options - Request options (headers, params)
 */
export async function apiGet<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  
  return fetchHandler<T>(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * POST request
 * @param endpoint - API endpoint path
 * @param options - Request options (headers, body, params)
 */
export async function apiPost<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  
  return fetchHandler<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * PUT request
 * @param endpoint - API endpoint path
 * @param options - Request options (headers, body, params)
 */
export async function apiPut<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  
  return fetchHandler<T>(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * DELETE request
 * @param endpoint - API endpoint path
 * @param options - Request options (headers, params)
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  
  return fetchHandler<T>(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

/**
 * PATCH request
 * @param endpoint - API endpoint path
 * @param options - Request options (headers, body, params)
 */
export async function apiPatch<T = any>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  
  return fetchHandler<T>(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Upload file(s) with FormData
 * @param endpoint - API endpoint path
 * @param formData - FormData object containing files and fields
 * @param options - Request options (headers, params)
 */
export async function apiUpload<T = any>(
  endpoint: string,
  formData: FormData,
  options?: Omit<RequestOptions, 'body'>
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  
  return fetchHandler<T>(url, {
    method: 'POST',
    headers: {
      // Don't set Content-Type for FormData, let browser set it with boundary
      ...options?.headers,
    },
    body: formData,
  });
}

// Export the base URL for direct access if needed
export { API_BASE_URL };
