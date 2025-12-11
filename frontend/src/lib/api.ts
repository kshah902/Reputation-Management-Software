import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              this.setTokens(response.accessToken, response.refreshToken);

              // Retry the original request
              if (error.config) {
                error.config.headers.Authorization = `Bearer ${response.accessToken}`;
                return this.client.request(error.config);
              }
            } catch {
              this.clearTokens();
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  loadTokens() {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      this.accessToken = accessToken;
    }
  }

  // Auth
  async register(data: {
    agencyName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await this.client.post<ApiResponse<any>>('/auth/register', data);
    return response.data.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post<ApiResponse<any>>('/auth/login', { email, password });
    return response.data.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post<ApiResponse<any>>('/auth/refresh', { refreshToken });
    return response.data.data.tokens;
  }

  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    await this.client.post('/auth/logout', { refreshToken });
    this.clearTokens();
  }

  async getMe() {
    const response = await this.client.get<ApiResponse<any>>('/auth/me');
    return response.data.data.user;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.post<ApiResponse<any>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data.data;
  }

  // Clients
  async getClients(params?: { search?: string; page?: number; limit?: number }) {
    const response = await this.client.get<ApiResponse<any>>('/clients', { params });
    return response.data.data;
  }

  async getClient(clientId: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}`);
    return response.data.data.client;
  }

  async createClient(data: { name: string; email: string; phone?: string; industry?: string }) {
    const response = await this.client.post<ApiResponse<any>>('/clients', data);
    return response.data.data.client;
  }

  async updateClient(clientId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(`/clients/${clientId}`, data);
    return response.data.data.client;
  }

  async deleteClient(clientId: string) {
    await this.client.delete(`/clients/${clientId}`);
  }

  async getClientDashboard(clientId: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/dashboard`);
    return response.data.data;
  }

  // Customers
  async getCustomers(clientId: string, params?: any) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/customers`, { params });
    return response.data.data;
  }

  async createCustomer(clientId: string, data: any) {
    const response = await this.client.post<ApiResponse<any>>(`/clients/${clientId}/customers`, data);
    return response.data.data.customer;
  }

  async updateCustomer(clientId: string, customerId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(`/clients/${clientId}/customers/${customerId}`, data);
    return response.data.data.customer;
  }

  async deleteCustomer(clientId: string, customerId: string) {
    await this.client.delete(`/clients/${clientId}/customers/${customerId}`);
  }

  async importCustomers(clientId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/customers/import`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  }

  // Campaigns
  async getCampaigns(clientId: string, params?: any) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/campaigns`, { params });
    return response.data.data;
  }

  async getCampaign(clientId: string, campaignId: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/campaigns/${campaignId}`);
    return response.data.data.campaign;
  }

  async createCampaign(clientId: string, data: any) {
    const response = await this.client.post<ApiResponse<any>>(`/clients/${clientId}/campaigns`, data);
    return response.data.data.campaign;
  }

  async updateCampaign(clientId: string, campaignId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(`/clients/${clientId}/campaigns/${campaignId}`, data);
    return response.data.data.campaign;
  }

  async deleteCampaign(clientId: string, campaignId: string) {
    await this.client.delete(`/clients/${clientId}/campaigns/${campaignId}`);
  }

  async launchCampaign(clientId: string, campaignId: string) {
    const response = await this.client.post<ApiResponse<any>>(`/clients/${clientId}/campaigns/${campaignId}/launch`);
    return response.data.data;
  }

  async pauseCampaign(clientId: string, campaignId: string) {
    const response = await this.client.post<ApiResponse<any>>(`/clients/${clientId}/campaigns/${campaignId}/pause`);
    return response.data.data;
  }

  async addCampaignRecipients(clientId: string, campaignId: string, customerIds: string[]) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/campaigns/${campaignId}/recipients`,
      { customerIds }
    );
    return response.data.data;
  }

  // Reviews
  async getReviews(clientId: string, params?: any) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/reviews`, { params });
    return response.data.data;
  }

  async getReview(clientId: string, reviewId: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/reviews/${reviewId}`);
    return response.data.data.review;
  }

  async generateAiSuggestions(clientId: string, reviewId: string) {
    const response = await this.client.post<ApiResponse<any>>(`/clients/${clientId}/reviews/${reviewId}/suggestions`);
    return response.data.data.suggestions;
  }

  async createReviewResponse(clientId: string, reviewId: string, content: string, publish?: boolean) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/reviews/${reviewId}/responses`,
      { content, publish }
    );
    return response.data.data.response;
  }

  async getReviewStats(clientId: string, params?: any) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/reviews/stats`, { params });
    return response.data.data;
  }

  // Business Profiles
  async getBusinessProfiles(clientId: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/business-profiles`);
    return response.data.data;
  }

  async getBusinessProfile(clientId: string, profileId: string) {
    const response = await this.client.get<ApiResponse<any>>(`/clients/${clientId}/business-profiles/${profileId}`);
    return response.data.data.profile;
  }

  async createBusinessProfile(clientId: string, data: any) {
    const response = await this.client.post<ApiResponse<any>>(`/clients/${clientId}/business-profiles`, data);
    return response.data.data.profile;
  }

  async getGoogleAuthUrl(clientId: string, profileId: string) {
    const response = await this.client.get<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/google/auth-url`
    );
    return response.data.data.authUrl;
  }

  async syncGoogleReviews(clientId: string, profileId: string) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/google/sync`
    );
    return response.data.data;
  }

  async updateBusinessProfile(clientId: string, profileId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}`,
      data
    );
    return response.data.data.profile;
  }

  async deleteBusinessProfile(clientId: string, profileId: string) {
    await this.client.delete(`/clients/${clientId}/business-profiles/${profileId}`);
  }

  // Business Profile Photos
  async getBusinessProfilePhotos(clientId: string, profileId: string) {
    const response = await this.client.get<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/photos`
    );
    return response.data.data;
  }

  async addBusinessProfilePhoto(clientId: string, profileId: string, data: any) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/photos`,
      data
    );
    return response.data.data.photo;
  }

  async deleteBusinessProfilePhoto(clientId: string, profileId: string, photoId: string) {
    await this.client.delete(`/clients/${clientId}/business-profiles/${profileId}/photos/${photoId}`);
  }

  // Business Profile Posts
  async getBusinessProfilePosts(clientId: string, profileId: string, status?: string) {
    const params = status ? { status } : {};
    const response = await this.client.get<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/posts`,
      { params }
    );
    return response.data.data.posts;
  }

  async createBusinessProfilePost(clientId: string, profileId: string, data: any) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/posts`,
      data
    );
    return response.data.data.post;
  }

  async updateBusinessProfilePost(clientId: string, profileId: string, postId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/posts/${postId}`,
      data
    );
    return response.data.data.post;
  }

  async deleteBusinessProfilePost(clientId: string, profileId: string, postId: string) {
    await this.client.delete(`/clients/${clientId}/business-profiles/${profileId}/posts/${postId}`);
  }

  async publishBusinessProfilePost(clientId: string, profileId: string, postId: string) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/posts/${postId}/publish`
    );
    return response.data.data.post;
  }

  // Business Profile Hours
  async updateBusinessProfileHours(clientId: string, profileId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(
      `/clients/${clientId}/business-profiles/${profileId}/hours`,
      data
    );
    return response.data.data.profile;
  }

  // Directory Listings
  async getAvailableDirectories(clientId: string) {
    const response = await this.client.get<ApiResponse<any>>(
      `/clients/${clientId}/directories/available`
    );
    return response.data.data.directories;
  }

  async getRecommendedDirectories(clientId: string, industry?: string) {
    const params = industry ? { industry } : {};
    const response = await this.client.get<ApiResponse<any>>(
      `/clients/${clientId}/directories/recommended`,
      { params }
    );
    return response.data.data.recommended;
  }

  async getDirectoryListings(clientId: string, profileId: string) {
    const response = await this.client.get<ApiResponse<any>>(
      `/clients/${clientId}/directories/profiles/${profileId}/listings`
    );
    return response.data.data;
  }

  async createDirectoryListing(clientId: string, profileId: string, data: any) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/directories/profiles/${profileId}/listings`,
      data
    );
    return response.data.data.listing;
  }

  async autoCreateDirectoryListings(clientId: string, profileId: string, directoryTypes?: string[]) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/directories/profiles/${profileId}/listings/auto-create`,
      { directoryTypes }
    );
    return response.data.data;
  }

  async syncAllDirectoryListings(clientId: string, profileId: string) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/directories/profiles/${profileId}/sync-all`
    );
    return response.data.data;
  }

  async updateDirectoryListing(clientId: string, listingId: string, data: any) {
    const response = await this.client.put<ApiResponse<any>>(
      `/clients/${clientId}/directories/listings/${listingId}`,
      data
    );
    return response.data.data.listing;
  }

  async deleteDirectoryListing(clientId: string, listingId: string) {
    await this.client.delete(`/clients/${clientId}/directories/listings/${listingId}`);
  }

  async checkDirectoryConsistency(clientId: string, listingId: string) {
    const response = await this.client.post<ApiResponse<any>>(
      `/clients/${clientId}/directories/listings/${listingId}/check-consistency`
    );
    return response.data.data;
  }
}

export const api = new ApiClient();
