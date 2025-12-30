/**
 * STUN/TURN Configuration Service
 * Manages ICE server configuration for WebRTC connections
 */

import { logger } from '../utils/logger';
import { STUNTURNConfig } from '../types/webrtc';

export interface TURNCredentials {
  username: string;
  credential: string;
  ttl?: number; // Time to live in seconds
}

export interface STUNTURNServiceConfig {
  stunServers: string[];
  turnServers: Array<{
    url: string;
    username?: string;
    credential?: string;
  }>;
  enableIPv6: boolean;
  credentialTTL: number;
}

export class STUNTURNService {
  private config: STUNTURNServiceConfig;
  private credentialsCache: Map<string, { credentials: TURNCredentials; expiresAt: Date }> = new Map();

  constructor(config: STUNTURNServiceConfig) {
    this.config = config;
    logger.info('STUN/TURN Service initialized', {
      stunServers: config.stunServers.length,
      turnServers: config.turnServers.length,
      enableIPv6: config.enableIPv6
    });
  }

  /**
   * Get ICE server configuration for WebRTC
   */
  public async getICEServerConfig(userId?: string): Promise<STUNTURNConfig> {
    try {
      const iceServers: RTCIceServer[] = [];

      // Add STUN servers
      this.config.stunServers.forEach(url => {
        iceServers.push({ urls: url });
      });

      // Add TURN servers
      for (const turnServer of this.config.turnServers) {
        const server: RTCIceServer = { urls: turnServer.url };

        if (turnServer.username && turnServer.credential) {
          // Use static credentials
          server.username = turnServer.username;
          server.credential = turnServer.credential;
        } else if (userId) {
          // Generate temporary credentials for user
          const credentials = await this.generateTURNCredentials(userId);
          server.username = credentials.username;
          server.credential = credentials.credential;
        }

        iceServers.push(server);
      }

      // Add default public STUN servers as fallback
      if (iceServers.length === 0) {
        iceServers.push(
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        );
      }

      logger.debug('Generated ICE server config', {
        userId,
        serverCount: iceServers.length
      });

      return { iceServers };

    } catch (error) {
      logger.error('Failed to get ICE server config', { userId, error });
      
      // Return fallback configuration
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };
    }
  }

  /**
   * Generate temporary TURN credentials for a user
   */
  private async generateTURNCredentials(userId: string): Promise<TURNCredentials> {
    // Check cache first
    const cached = this.credentialsCache.get(userId);
    if (cached && cached.expiresAt > new Date()) {
      logger.debug('Using cached TURN credentials', { userId });
      return cached.credentials;
    }

    try {
      // Generate time-based credentials
      const timestamp = Math.floor(Date.now() / 1000) + this.config.credentialTTL;
      const username = `${timestamp}:${userId}`;
      
      // In a real implementation, you would generate the credential using HMAC-SHA1
      // with a shared secret. For this example, we'll use a simple hash.
      const credential = this.generateCredentialHash(username);

      const credentials: TURNCredentials = {
        username,
        credential,
        ttl: this.config.credentialTTL
      };

      // Cache credentials
      const expiresAt = new Date(Date.now() + (this.config.credentialTTL * 1000));
      this.credentialsCache.set(userId, { credentials, expiresAt });

      logger.debug('Generated new TURN credentials', { userId, username });
      return credentials;

    } catch (error) {
      logger.error('Failed to generate TURN credentials', { userId, error });
      throw error;
    }
  }

  /**
   * Generate credential hash (simplified version)
   * In production, use HMAC-SHA1 with a shared secret
   */
  private generateCredentialHash(username: string): string {
    // This is a simplified implementation
    // In production, use: HMAC-SHA1(username, shared_secret)
    const crypto = require('crypto');
    const sharedSecret = process.env.TURN_SHARED_SECRET || 'default-secret';
    
    return crypto
      .createHmac('sha1', sharedSecret)
      .update(username)
      .digest('base64');
  }

  /**
   * Validate TURN credentials
   */
  public validateTURNCredentials(username: string, credential: string): boolean {
    try {
      // Extract timestamp from username
      const parts = username.split(':');
      if (parts.length !== 2) {
        return false;
      }

      const timestamp = parseInt(parts[0]);
      const userId = parts[1];

      // Check if credentials are expired
      const now = Math.floor(Date.now() / 1000);
      if (timestamp < now) {
        logger.debug('TURN credentials expired', { username, timestamp, now });
        return false;
      }

      // Validate credential hash
      const expectedCredential = this.generateCredentialHash(username);
      const isValid = credential === expectedCredential;

      logger.debug('TURN credential validation', {
        username,
        isValid,
        timestamp,
        userId
      });

      return isValid;

    } catch (error) {
      logger.error('Error validating TURN credentials', { username, error });
      return false;
    }
  }

  /**
   * Clean up expired credentials from cache
   */
  public cleanupExpiredCredentials(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, cached] of this.credentialsCache.entries()) {
      if (cached.expiresAt <= now) {
        this.credentialsCache.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired TURN credentials', { cleanedCount });
    }
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    stunServers: number;
    turnServers: number;
    cachedCredentials: number;
    enableIPv6: boolean;
  } {
    return {
      stunServers: this.config.stunServers.length,
      turnServers: this.config.turnServers.length,
      cachedCredentials: this.credentialsCache.size,
      enableIPv6: this.config.enableIPv6
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<STUNTURNServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Clear credentials cache when config changes
    this.credentialsCache.clear();
    
    logger.info('STUN/TURN configuration updated', {
      stunServers: this.config.stunServers.length,
      turnServers: this.config.turnServers.length
    });
  }

  /**
   * Test connectivity to STUN/TURN servers
   */
  public async testConnectivity(): Promise<{
    stun: { [url: string]: boolean };
    turn: { [url: string]: boolean };
  }> {
    const results = {
      stun: {} as { [url: string]: boolean },
      turn: {} as { [url: string]: boolean }
    };

    // Test STUN servers
    for (const stunUrl of this.config.stunServers) {
      try {
        // Create a simple RTCPeerConnection to test STUN connectivity
        const pc = new RTCPeerConnection({ iceServers: [{ urls: stunUrl }] });
        
        // Create a data channel to trigger ICE gathering
        pc.createDataChannel('test');
        
        // Create and set local description to start ICE gathering
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Wait for ICE gathering to complete or timeout
        const connected = await this.waitForICEGathering(pc, 5000);
        results.stun[stunUrl] = connected;
        
        pc.close();
        
      } catch (error) {
        logger.error('STUN connectivity test failed', { stunUrl, error });
        results.stun[stunUrl] = false;
      }
    }

    // Test TURN servers (simplified - would need actual TURN server testing)
    for (const turnServer of this.config.turnServers) {
      try {
        // For TURN testing, you would typically need to create actual peer connections
        // and verify relay candidates are generated. This is a simplified check.
        results.turn[turnServer.url] = true; // Placeholder
        
      } catch (error) {
        logger.error('TURN connectivity test failed', { turnUrl: turnServer.url, error });
        results.turn[turnServer.url] = false;
      }
    }

    logger.info('Connectivity test completed', { results });
    return results;
  }

  private waitForICEGathering(pc: RTCPeerConnection, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve(false);
      }, timeout);

      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timer);
          resolve(true);
        }
      };
    });
  }
}