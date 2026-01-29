const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80'

interface ApiResponse<T> {
  data?: T
  error?: string
  detail?: string
}

interface AddMemberResponse {
  success: boolean
  message: string
  user_id: number
  is_new_user?: boolean
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getAuthToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const url = `${this.baseURL}${endpoint}`
      console.log(`[API] ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, {
        ...options,
        headers,
      })

      let data
      const contentType = response.headers.get('content-type')
      
      // Handle both JSON and non-JSON responses
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        try {
          data = JSON.parse(text)
        } catch {
          data = { detail: text || 'An error occurred' }
        }
      }

      if (!response.ok) {
        return { error: data.detail || data.message || 'An error occurred' }
      }

      return { data }
    } catch (error) {
      // Provide more specific error messages
      console.error(`[API] Request failed:`, error)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return { error: `Failed to connect to server at ${this.baseURL}. Please check if the backend is running on the correct port.` }
      }
      return { error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.post<{ token: string }>('/auth/login', {
      email,
      password,
    })
    
    if (response.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('token', response.data.token)
    }
    
    return response
  }

  async signup(userData: {
    first_name: string
    last_name: string
    email: string
    password: string
    embedding?: number[]
  }) {
    return this.post('/auth/signup', userData)
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  async getCurrentUser() {
    return this.get<{
      data: {
        id: number
        first_name: string
        last_name: string
        email: string
      }
    }>('/protected/testToken')
  }

  async uploadCSV(eventId: number, file: File) {
    const token = this.getAuthToken()
    if (!token) {
      return { error: 'Not authenticated' }
    }

    const formData = new FormData()
    formData.append('csv_file', file)

    try {
      const url = `${this.baseURL}/protected/event/${eventId}/uploadUserCSV`
      console.log(`[API] POST ${url}`)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return { error: data.detail || data.message || 'Failed to upload CSV' }
      }

      return { data }
    } catch (error) {
      console.error(`[API] CSV upload failed:`, error)
      return { error: error instanceof Error ? error.message : 'Network error' }
    }
  }

  async addMember(eventId: number, memberData: {
    first_name: string
    last_name: string
    email: string
  }) {
    return this.post<AddMemberResponse>(`/protected/event/${eventId}/addMember`, memberData)
  }

  async getEventUsers(eventId: number) {
    return this.post<Array<{
      id: number
      first_name: string
      last_name: string
      email: string
    }>>('/protected/event/getUsers', { id: eventId })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

