const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface User {
  id: string
  email: string
  nickname: string
  role: string
}

class APIClient {
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('authToken')
  }

  private setAuthToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('authToken', token)
  }

  private getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    const userJson = localStorage.getItem('currentUser')
    if (!userJson) return null
    try {
      return JSON.parse(userJson) as User
    } catch {
      return null
    }
  }

  setCurrentUser(user: User, token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('currentUser', JSON.stringify(user))
    this.setAuthToken(token)
  }

  clearAuth(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('authToken')
    localStorage.removeItem('currentUser')
  }

  private async fetch(endpoint: string, options?: RequestInit) {
    const url = `${API_BASE_URL}${endpoint}`
    const token = this.getAuthToken()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  async registerUser(data: { email: string; nickname: string }) {
    const result = await this.fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (result.success && result.user && result.token) {
      this.setCurrentUser(result.user, result.token)
    }

    return result
  }

  async getRooms() {
    return this.fetch('/api/rooms')
  }

  async createRoom(data: { title: string; theme: string }) {
    return this.fetch('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  getUser(): User | null {
    return this.getCurrentUser()
  }

  async getMessages(roomId: string) {
    return this.fetch(`/api/rooms/${roomId}/messages`)
  }

  async sendMessage(roomId: string, data: { content: string }) {
    return this.fetch(`/api/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getStrokes(roomId: string) {
    return this.fetch(`/api/rooms/${roomId}/strokes`)
  }

  async createStroke(roomId: string, data: { tool: string; color: string; width: number; points: Array<{ x: number; y: number }> }) {
    return this.fetch(`/api/rooms/${roomId}/strokes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async clearStrokes(roomId: string) {
    return this.fetch(`/api/rooms/${roomId}/strokes`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new APIClient()
