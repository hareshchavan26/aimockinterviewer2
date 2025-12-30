import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { FileStorageService } from '../types';

export class LocalFileStorageService implements FileStorageService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(uploadDir: string = './uploads', baseUrl: string = 'http://localhost:3001/uploads') {
    this.uploadDir = uploadDir;
    this.baseUrl = baseUrl;
  }

  async uploadFile(file: Buffer, originalFilename: string, mimeType: string): Promise<{ url: string; filename: string }> {
    // Ensure upload directory exists
    await this.ensureUploadDir();

    // Generate unique filename
    const ext = path.extname(originalFilename);
    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    // Write file to disk
    await fs.writeFile(filepath, file);

    const url = `${this.baseUrl}/${filename}`;
    return { url, filename };
  }

  async deleteFile(filename: string): Promise<void> {
    const filepath = path.join(this.uploadDir, filename);
    
    try {
      await fs.unlink(filepath);
    } catch (error: any) {
      // Ignore file not found errors
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async generateThumbnail(file: Buffer, mimeType: string): Promise<Buffer> {
    if (!mimeType.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    try {
      return await sharp(file)
        .resize(150, 150, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (error) {
      throw new Error('Failed to generate thumbnail');
    }
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }
}

// Mock file storage service for testing
export class MockFileStorageService implements FileStorageService {
  private files: Map<string, Buffer> = new Map();

  async uploadFile(file: Buffer, originalFilename: string, mimeType: string): Promise<{ url: string; filename: string }> {
    const filename = `mock-${crypto.randomUUID()}-${originalFilename}`;
    this.files.set(filename, file);
    
    return {
      url: `http://mock-storage.com/${filename}`,
      filename
    };
  }

  async deleteFile(filename: string): Promise<void> {
    this.files.delete(filename);
  }

  async generateThumbnail(file: Buffer, mimeType: string): Promise<Buffer> {
    if (!mimeType.startsWith('image/')) {
      throw new Error('File is not an image');
    }
    
    // Return a mock thumbnail (just the original file for testing)
    return file;
  }

  reset(): void {
    this.files.clear();
  }

  getFile(filename: string): Buffer | undefined {
    return this.files.get(filename);
  }
}