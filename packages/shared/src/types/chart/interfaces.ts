import { MarketData } from '../core/market'

/**
 * 共通チャートコンポーネントインターフェース
 * すべての Chart 実装で統一された API を提供
 */
export interface IChartComponent {
  /**
   * チャートをレンダリングする
   * @returns JSX.Element
   */
  render(): JSX.Element

  /**
   * 市場データを更新する
   * @param data 新しい市場データ
   */
  updateData(data: MarketData): void

  /**
   * チャートのクリーンアップを実行
   * メモリリークを防ぐためのリソース解放
   */
  cleanup(): void

  /**
   * チャートのサイズを変更する
   * @param width 新しい幅
   * @param height 新しい高さ
   */
  resize?(width: number, height: number): void

  /**
   * チャートの設定を更新する
   * @param config 新しい設定
   */
  updateConfig?(config: ChartConfig): void

  /**
   * チャートの現在の状態を取得
   * @returns チャートの状態
   */
  getState?(): ChartState
}

/**
 * チャート設定インターフェース
 */
export interface ChartConfig {
  theme?: 'light' | 'dark'
  timeframe?: string
  indicators?: string[]
  drawingTools?: boolean
  autoScale?: boolean
  crosshair?: boolean
  volume?: boolean
}

/**
 * チャート状態インターフェース
 */
export interface ChartState {
  isLoading: boolean
  hasData: boolean
  lastUpdate: Date | null
  error: string | null
  visibleRange?: {
    from: Date
    to: Date
  }
}

/**
 * チャートファクトリーインターフェース
 * 異なるタイプのチャートを生成するためのファクトリーパターン
 */
export interface IChartFactory {
  /**
   * チャートインスタンスを作成
   * @param type チャートのタイプ
   * @param config 初期設定
   * @returns チャートインスタンス
   */
  createChart(type: ChartType, config: ChartConfig): IChartComponent

  /**
   * サポートされているチャートタイプを取得
   * @returns サポートされているタイプの配列
   */
  getSupportedTypes(): ChartType[]
}

/**
 * チャートタイプ定義
 */
export type ChartType = 
  | 'tradingview-lightweight'
  | 'echarts'
  | 'candlestick'
  | 'line'
  | 'area'

/**
 * チャートイベントインターフェース
 */
export interface ChartEvents {
  onDataUpdate?: (data: MarketData) => void
  onTimeRangeChange?: (from: Date, to: Date) => void
  onIndicatorChange?: (indicators: string[]) => void
  onError?: (error: string) => void
  onResize?: (width: number, height: number) => void
}

/**
 * チャートプロバイダーインターフェース
 * コンテキストプロバイダーで使用
 */
export interface IChartProvider {
  chart: IChartComponent | null
  config: ChartConfig
  state: ChartState
  updateChart: (chart: IChartComponent) => void
  updateConfig: (config: Partial<ChartConfig>) => void
  updateState: (state: Partial<ChartState>) => void
}