import { useMemo } from 'react'
import { ChartApplicationService } from '@/application/services/ChartApplicationService'
import {
  ChartAnalysisServiceImpl,
  ChartPatternDetectionService,
} from '@/domain/services/ChartAnalysisService'
import { ApiChartRepository } from '@/infrastructure/repositories/ApiChartRepository'

/**
 * Clean Architecture 準拠のチャートアプリケーションサービスを提供するフック
 */
export const useChartApplicationService = () => {
  const service = useMemo(() => {
    // Infrastructure層のリポジトリ
    const chartRepository = new ApiChartRepository()

    // Domain層のサービス
    const analysisService = new ChartAnalysisServiceImpl()
    const patternDetectionService = new ChartPatternDetectionService()

    // Application層のサービス
    return new ChartApplicationService(chartRepository, analysisService, patternDetectionService)
  }, [])

  return service
}
