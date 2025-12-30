/**
 * Media Routes
 * HTTP routes for media streaming and processing endpoints
 */

import { Router } from 'express';
import { MediaController } from '../controllers/media-controller';
import { MediaStreamingService } from '../services/media-streaming-service';
import { MediaProcessingPipelineService } from '../services/media-processing-pipeline';

export function createMediaRoutes(
  mediaStreamingService: MediaStreamingService,
  processingPipelineService: MediaProcessingPipelineService
): Router {
  const router = Router();
  const mediaController = new MediaController(
    mediaStreamingService,
    processingPipelineService
  );

  // Media Stream endpoints
  router.post('/streams', mediaController.createStream);
  router.get('/streams', mediaController.getActiveStreams);
  router.get('/streams/:streamId', mediaController.getStream);
  router.put('/streams/:streamId/quality', mediaController.updateQualityMetrics);
  router.delete('/streams/:streamId', mediaController.stopStream);

  // Processing Pipeline endpoints
  router.post('/pipelines', mediaController.createPipeline);
  router.get('/pipelines', mediaController.getActivePipelines);
  router.get('/pipelines/:pipelineId', mediaController.getPipeline);
  router.post('/pipelines/:pipelineId/start', mediaController.startProcessing);
  router.post('/pipelines/:pipelineId/stop', mediaController.stopProcessing);
  router.delete('/pipelines/:pipelineId', mediaController.cleanupPipeline);

  // Media Processing endpoints
  router.post('/pipelines/:pipelineId/process', mediaController.processMediaData);
  router.post('/pipelines/:pipelineId/queue', mediaController.queueMediaData);

  // Statistics endpoint
  router.get('/stats', mediaController.getStats);

  return router;
}