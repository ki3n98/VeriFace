const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:80";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  detail?: string;
}

interface AddMemberResponse {
  success: boolean;
  message: string;
  user_id: number;
  is_new_user?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken();

    // Detect FormData (so we don't force JSON headers/body)
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData;

    // Start from caller headers (if any)
    const headers: Record<string, string> = {
      accept: "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Only set JSON content-type when NOT FormData and when caller didn't already set it
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`[API] ${options.method || "GET"} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Read body once (prevents "body stream already read")
      const raw = await response.text();

      // Parse response (JSON if possible, otherwise treat as text)
      let data: any = null;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = raw;
        }
      } else {
        // sometimes FastAPI returns plain text
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = { detail: raw || "An error occurred" };
        }
      }

      if (!response.ok) {
        // FastAPI often returns {detail:[{msg,...}]} for validation errors
        const detail = data?.detail;
        const message =
          (Array.isArray(detail) ? detail?.[0]?.msg : detail) ||
          data?.message ||
          data?.error ||
          "An error occurred";

        return { error: message };
      }

      return { data };
    } catch (error) {
      console.error(`[API] Request failed:`, error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        return {
          error: `Failed to connect to server at ${this.baseURL}. Please check if the backend is running and NEXT_PUBLIC_API_URL is correct.`,
        };
      }
      return { error: error instanceof Error ? error.message : "Network error" };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  // ✅ UPDATED: post supports JSON objects OR FormData
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

    return this.request<T>(endpoint, {
      method: "POST",
      // ✅ If FormData, send as-is. If object, JSON stringify.
      body: isFormData ? (body as FormData) : body != null ? JSON.stringify(body) : undefined,
      // ✅ If FormData, DO NOT set Content-Type; browser sets boundary.
      headers: isFormData ? { accept: "application/json" } : undefined,
    });
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.post<{ token: string }>("/auth/login", {
      email,
      password,
    });

    if (response.data?.token && typeof window !== "undefined") {
      localStorage.setItem("token", response.data.token);
    }

    return response;
  }

  async signup(userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    embedding?: number[];
  }) {
    return this.post("/auth/signup", userData);
  }

  logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  }

  async getCurrentUser() {
    return this.get<{
      data: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
      };
    }>("/protected/testToken");
  }

  async uploadCSV(eventId: number, file: File) {
    const token = this.getAuthToken();
    if (!token) {
      return { error: "Not authenticated" };
    }

    const formData = new FormData();
    formData.append("csv_file", file);

    try {
      const url = `${this.baseURL}/protected/event/${eventId}/uploadUserCSV`;
      console.log(`[API] POST ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const raw = await response.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { detail: raw };
      }

      if (!response.ok) {
        return { error: data.detail || data.message || "Failed to upload CSV" };
      }

      return { data };
    } catch (error) {
      console.error(`[API] CSV upload failed:`, error);
      return { error: error instanceof Error ? error.message : "Network error" };
    }
  }

  async addMember(
    eventId: number,
    memberData: {
      first_name: string;
      last_name: string;
      email: string;
    }
  ) {
    return this.post<AddMemberResponse>(
      `/protected/event/${eventId}/addMember`,
      memberData
    );
  }

  async getEventUsers(eventId: number) {
    return this.post<
      Array<{
        id: number;
        first_name: string;
        last_name: string;
        email: string;
      }>
    >("/protected/event/getUsers", { id: eventId });
  }

  async removeEvent(eventId: number) {
    return this.post<{ success: boolean; message: string }>(
      "/protected/event/removeEvent",
      { event_id: eventId }
    );
  }

  async removeMember(eventId: number, memberId: number) {
    return this.post<{ success: boolean; message: string }>(
      `/protected/event/${eventId}/removeMember?member_id=${memberId}`,
      {}
    );
  }

  async sendInviteEmails(eventId: number) {
    return this.post<{
      success: boolean;
      message: string;
      sent_count: number;
      failed_count: number;
      failed_emails: string[];
    }>(`/protected/event/${eventId}/sendInviteEmails`);
  }

  // User Settings
  async getUserSettings() {
    return this.get<{
      user_id: number;
      display_theme: string;
    }>("/protected/settings/");
  }

  async updateUserSettings(theme: string) {
    return this.request<{
      user_id: number;
      display_theme: string;
    }>("/protected/settings/", {
      method: "PATCH",
      body: JSON.stringify({ display_theme: theme }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
