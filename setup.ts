// Test setup file
import { logger } from '../utils/logger';

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress logs during testing
logger.silent = true;