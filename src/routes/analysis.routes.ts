import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';

const router = Router();
const analysisController = new AnalysisController();

// Create new analysis
router.post('/', analysisController.createAnalysis.bind(analysisController));

// Get all analyses for user with pagination and sorting
router.get('/', analysisController.getAnalyses.bind(analysisController));

// Get analysis statistics for user
router.get(
  '/stats',
  analysisController.getAnalysisStats.bind(analysisController)
);

// Get analyses by date range
router.get(
  '/date-range',
  analysisController.getAnalysesByDateRange.bind(analysisController)
);

// Search analyses by keyword
router.get(
  '/search',
  analysisController.searchAnalysesByKeyword.bind(analysisController)
);

// Bulk delete analyses
router.delete(
  '/bulk',
  analysisController.bulkDeleteAnalyses.bind(analysisController)
);

// Get analyses by platform
router.get(
  '/platform/:platform',
  analysisController.getAnalysesByPlatform.bind(analysisController)
);

// Get analyses by sentiment
router.get(
  '/sentiment/:sentiment',
  analysisController.getAnalysesBySentiment.bind(analysisController)
);

// Get analysis by post ID
router.get(
  '/post/:postId',
  analysisController.getAnalysisByPostId.bind(analysisController)
);

// Get specific analysis by ID
router.get(
  '/:analysisId',
  analysisController.getAnalysis.bind(analysisController)
);

// Update specific analysis
router.put(
  '/:analysisId',
  analysisController.updateAnalysis.bind(analysisController)
);

// Delete specific analysis
router.delete(
  '/:analysisId',
  analysisController.deleteAnalysis.bind(analysisController)
);

export default router;
