const getApiBase = () => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    return hostname ? `http://${hostname}:8000/api/v1` : "http://localhost:8000/api/v1";
  }
  return "http://localhost:8000/api/v1";
};

const API_BASE = getApiBase();

export interface ApiError {
  detail: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = { detail: "Failed to parse server response" };
  }

  if (!response.ok) {
    throw new Error(data.detail || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { method: "GET", ...options }),
    
  post: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      method: "POST", 
      body: body ? JSON.stringify(body) : undefined, 
      ...options 
    }),

  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { method: "DELETE", ...options }),
    
  postForm: <T>(endpoint: string, formData: FormData, options?: RequestInit) =>
    request<T>(endpoint, {
      method: "POST",
      body: formData,
      ...options
    })
};
