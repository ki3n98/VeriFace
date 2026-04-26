import type { EventRole } from "./eventRoles";

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

interface CsvUploadSuccessResponse {
  success: true;
  message: string;
  total_rows: number;
  new_users_created?: number;
  existing_users_added?: number;
  users_already_in_event?: number;
}

interface CsvUploadFailureResponse {
  success: false;
  message: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors?: Array<{
    row_number: number;
    first_name: string;
    last_name: string;
    email: string;
    error_message: string;
  }>;
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
      "ngrok-skip-browser-warning": "true",
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
      let data: unknown = null;
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
        const errorData = typeof data === "object" && data !== null
          ? data as Record<string, unknown>
          : {};
        const detail = errorData.detail;
        const message =
          (Array.isArray(detail) ? detail?.[0]?.msg : detail) ||
          errorData.message ||
          errorData.error ||
          "An error occurred";

        return { error: message };
      }

      return { data: data as T };
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
        avatar_url: string | null;
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
          "ngrok-skip-browser-warning": "true",
        },
        body: formData,
      });

      const raw = await response.text();
      let data: unknown = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { detail: raw };
      }

      if (!response.ok) {
        const errorData = typeof data === "object" && data !== null
          ? data as Record<string, unknown>
          : {};
        return {
          error:
            (typeof errorData.detail === "string" && errorData.detail)
            || (typeof errorData.message === "string" && errorData.message)
            || "Failed to upload CSV",
        };
      }

      return { data: data as CsvUploadSuccessResponse | CsvUploadFailureResponse };
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
        role: EventRole;
      }>
    >("/protected/event/getUsers", { id: eventId });
  }

  async updateMemberRole(eventId: number, userId: number, role: EventRole) {
    return this.post<{ success: boolean; message: string }>(
      `/protected/event/${eventId}/updateMemberRole`,
      { user_id: userId, role }
    );
  }

  async updateEventDefaultStartTime(eventId: number, defaultStartTime: string | null) {
    return this.post<{ id: number; event_name: string; default_start_time?: string }>(
      "/protected/event/updateDefaultStartTime",
      { event_id: eventId, default_start_time: defaultStartTime }
    );
  }

  async getEventAuditLog(
    eventId: number,
    options?: {
      limit?: number;
      offset?: number;
      category?: "add" | "remove" | "update";
    },
  ) {
    const body: {
      event_id: number;
      limit: number;
      offset: number;
      category?: "add" | "remove" | "update";
    } = {
      event_id: eventId,
      limit: options?.limit ?? 25,
      offset: options?.offset ?? 0,
    };
    if (options?.category) {
      body.category = options.category;
    }
    return this.post<{
      success: boolean;
      has_more: boolean;
      entries: Array<{
        id: number;
        event_id: number;
        actor_user_id: number;
        actor_name: string;
        action: string;
        category: "add" | "remove" | "update" | string;
        message: string;
        details?: Record<string, unknown> | null;
        created_at: string | null;
      }>;
    }>("/protected/event/getAuditLog", body);
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

  // Sessions
  async createSession(eventId: number, startTime?: string) {
    const body: { event_id: number; start_time?: string } = { event_id: eventId };
    if (startTime) body.start_time = startTime;
    return this.post<{
      success: boolean;
      session: { id: number; event_id: number; sequence_number: number; start_time?: string; notes?: string | null };
    }>("/protected/session/createSession", body);
  }

  async getSessions(eventId: number) {
    return this.post<{
      success: boolean;
      sessions: Array<{
        id: number;
        event_id: number;
        sequence_number: number;
        start_time?: string | null;
        notes?: string | null;
      }>;
    }>("/protected/session/getSessions", { event_id: eventId });
  }

  async updateSessionStartTime(sessionId: number, startTime: string | null) {
    return this.post<{
      success: boolean;
      session: { id: number; event_id: number; sequence_number: number; start_time?: string | null; notes?: string | null };
    }>("/protected/session/updateSessionStartTime", {
      session_id: sessionId,
      start_time: startTime || null,
    });
  }

  async updateSessionNotes(sessionId: number, notes: string) {
    return this.post<{
      success: boolean;
      session: { id: number; event_id: number; sequence_number: number; start_time?: string | null; notes?: string | null };
    }>("/protected/session/updateNotes", {
      session_id: sessionId,
      notes,
    });
  }

  async getSessionAttendance(sessionId: number) {
    return this.post<{
      success: boolean;
      attendance: Array<{
        user_id: number;
        first_name: string;
        last_name: string;
        email: string;
        status: string;
        check_in_time: string | null;
      }>;
      summary: {
        present: number;
        late: number;
        absent: number;
        total: number;
      };
    }>("/protected/session/getAttendance", { session_id: sessionId });
  }

  async getEventAttendanceOverview(eventId: number) {
    return this.post<{
      success: boolean;
      per_session: Array<{
        session_id: number;
        sequence_number: number;
        label: string;
        present: number;
        late: number;
        absent: number;
        total: number;
      }>;
      overall: {
        present: number;
        late: number;
        absent: number;
        total: number;
      };
    }>("/protected/session/getEventAttendanceOverview", { event_id: eventId });
  }

  async getMyAttendance(eventId: number) {
    return this.post<{
      success: boolean;
      sessions: Array<{
        session_id: number;
        sequence_number: number;
        start_time: string | null;
        status: string;
        check_in_time: string | null;
      }>;
      summary: {
        total_sessions: number;
        present: number;
        late: number;
        absent: number;
        attendance_rate: number;
      };
    }>("/protected/session/getMyAttendance", { event_id: eventId });
  }

  async updateAttendanceStatus(
    userId: number,
    sessionId: number,
    status: "present" | "late" | "absent"
  ) {
    return this.post<{
      success: boolean;
      user_id: number;
      session_id: number;
      status: string;
      check_in_time: string | null;
    }>("/protected/session/updateAttendanceStatus", {
      user_id: userId,
      session_id: sessionId,
      status,
    });
  }

  async checkOcclusion(file: File) {
    const formData = new FormData();
    formData.append("upload_image", file);
    return this.post<{ occluded: boolean; confidence: number; enabled: boolean }>(
      "/protected/check-occlusion",
      formData
    );
  }

  async uploadPictureMulti(files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append("upload_images", file);
    }
    return this.post<unknown>("/protected/uploadPictureMulti", formData);
  }

  async resetEmbedding() {
    return this.request<void>("/protected/embedding", { method: "DELETE" });
  }

  async checkIn(sessionId: number, imageFile: File) {
    const formData = new FormData();
    formData.append("upload_image", imageFile);
    return this.post<Array<{ success: boolean; data?: unknown; error?: string }>>(
      `/protected/session/checkin?session_id=${sessionId}`,
      formData
    );
  }

  // Avatar
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.post<{ signed_url: string }>("/protected/avatar/upload", formData);
  }

  async getAvatarUrl() {
    return this.get<{ signed_url: string | null }>("/protected/avatar/url");
  }

  // User Settings
  // Achievements
  async getAchievements() {
    return this.get<{
      data: Array<{ id: string; earned: boolean }>
    }>("/protected/achievements")
  }

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

  async updateProfile(firstName: string, lastName: string) {
    return this.request<{
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      avatar_url: string | null;
    }>("/protected/profile/", {
      method: "PATCH",
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });
  }

  async requestEmailChange(newEmail: string) {
    return this.post<{ message: string }>("/protected/email-change/request", {
      new_email: newEmail,
    });
  }

  async verifyEmailChange(token: string) {
    return this.get<{ message: string }>(
      `/protected/email-change/verify?token=${encodeURIComponent(token)}`
    );
  }

  // Breakout Rooms
  async getBreakoutRooms(eventId: number) {
    return this.post<{
      success: boolean;
      assignments: Array<{
        user_id: number;
        room_number: number;
        first_name: string;
        last_name: string;
        email: string;
      }>;
    }>("/protected/breakout/getBreakoutRooms", { event_id: eventId });
  }

  async autoAssignBreakoutRooms(eventId: number, numRooms: number, userIds: number[]) {
    return this.post<{ success: boolean; message: string }>(
      "/protected/breakout/autoAssign",
      { event_id: eventId, num_rooms: numRooms, user_ids: userIds }
    );
  }

  async pushUsersToBreakoutRoom(eventId: number, roomNumber: number, userIds: number[]) {
    return this.post<{ success: boolean; message: string }>(
      "/protected/breakout/pushUsers",
      { event_id: eventId, room_number: roomNumber, user_ids: userIds }
    );
  }

  async removeUserFromBreakoutRoom(eventId: number, userId: number) {
    return this.post<{ success: boolean; message: string }>(
      "/protected/breakout/removeUser",
      { event_id: eventId, user_id: userId }
    );
  }

  async endBreakoutRooms(eventId: number) {
    return this.post<{ success: boolean; message: string }>(
      "/protected/breakout/endBreakoutRooms",
      { event_id: eventId }
    );
  }

  async getMyBreakoutRoom(eventId: number) {
    return this.post<{
      success: boolean;
      room_number: number | null;
      members: Array<{
        user_id: number;
        first_name: string;
        last_name: string;
        email: string;
      }>;
    }>("/protected/breakout/getMyRoom", { event_id: eventId });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
