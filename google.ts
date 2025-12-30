import axios from 'axios';
import { OAuthService, OAuthProfile, OAuthTokens, UnauthorizedError } from '../../types';

export class GoogleOAuthService implements OAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';
  private readonly userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    try {
      const response = await axios.post(this.tokenUrl, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
      };
    } catch (error) {
      console.error('Google OAuth token exchange failed:', error);
      throw new UnauthorizedError('Failed to exchange authorization code for tokens');
    }
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      const response = await axios.get(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const { id, email, given_name, family_name, picture } = response.data;

      if (!email) {
        throw new UnauthorizedError('Email not provided by Google');
      }

      return {
        id,
        email,
        firstName: given_name || '',
        lastName: family_name || '',
        profilePicture: picture,
        provider: 'google',
      };
    } catch (error) {
      console.error('Google OAuth user profile fetch failed:', error);
      throw new UnauthorizedError('Failed to fetch user profile from Google');
    }
  }
}