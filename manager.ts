import { GoogleOAuthService } from './google';
import { GitHubOAuthService } from './github';
import { OAuthService, OAuthConfig, UnauthorizedError } from '../../types';

export class OAuthManager {
  private readonly googleService?: GoogleOAuthService;
  private readonly githubService?: GitHubOAuthService;

  constructor(config: OAuthConfig) {
    if (config.google?.clientId && config.google?.clientSecret) {
      this.googleService = new GoogleOAuthService(
        config.google.clientId,
        config.google.clientSecret,
        config.google.callbackUrl
      );
    }

    if (config.github?.clientId && config.github?.clientSecret) {
      this.githubService = new GitHubOAuthService(
        config.github.clientId,
        config.github.clientSecret,
        config.github.callbackUrl
      );
    }
  }

  getService(provider: 'google' | 'github'): OAuthService {
    switch (provider) {
      case 'google':
        if (!this.googleService) {
          throw new UnauthorizedError('Google OAuth is not configured');
        }
        return this.googleService;
      
      case 'github':
        if (!this.githubService) {
          throw new UnauthorizedError('GitHub OAuth is not configured');
        }
        return this.githubService;
      
      default:
        throw new UnauthorizedError(`Unsupported OAuth provider: ${provider}`);
    }
  }

  isProviderEnabled(provider: 'google' | 'github'): boolean {
    switch (provider) {
      case 'google':
        return !!this.googleService;
      case 'github':
        return !!this.githubService;
      default:
        return false;
    }
  }

  getEnabledProviders(): Array<'google' | 'github'> {
    const providers: Array<'google' | 'github'> = [];
    
    if (this.googleService) {
      providers.push('google');
    }
    
    if (this.githubService) {
      providers.push('github');
    }
    
    return providers;
  }
}