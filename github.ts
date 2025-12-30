import axios from 'axios';
import { OAuthService, OAuthProfile, OAuthTokens, UnauthorizedError } from '../../types';

export class GitHubOAuthService implements OAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly authUrl = 'https://github.com/login/oauth/authorize';
  private readonly tokenUrl = 'https://github.com/login/oauth/access_token';
  private readonly userUrl = 'https://api.github.com/user';
  private readonly userEmailsUrl = 'https://api.github.com/user/emails';

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user:email',
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
      }, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const { access_token } = response.data;

      if (!access_token) {
        throw new Error('No access token received');
      }

      return {
        accessToken: access_token,
      };
    } catch (error) {
      console.error('GitHub OAuth token exchange failed:', error);
      throw new UnauthorizedError('Failed to exchange authorization code for tokens');
    }
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    try {
      // Get user profile
      const userResponse = await axios.get(this.userUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'AI-Interview-Platform',
        },
      });

      const { id, login, name, avatar_url } = userResponse.data;

      // Get user emails
      const emailsResponse = await axios.get(this.userEmailsUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'AI-Interview-Platform',
        },
      });

      // Find primary email
      const emails = emailsResponse.data;
      const primaryEmail = emails.find((email: any) => email.primary && email.verified);
      
      if (!primaryEmail) {
        throw new UnauthorizedError('No verified primary email found in GitHub account');
      }

      // Parse name
      const nameParts = (name || login || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      return {
        id: id.toString(),
        email: primaryEmail.email,
        firstName,
        lastName,
        profilePicture: avatar_url,
        provider: 'github',
      };
    } catch (error) {
      console.error('GitHub OAuth user profile fetch failed:', error);
      throw new UnauthorizedError('Failed to fetch user profile from GitHub');
    }
  }
}