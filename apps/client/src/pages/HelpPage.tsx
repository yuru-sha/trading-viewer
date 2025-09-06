import React from 'react'
import { Icon } from '@trading-viewer/ui'

const HelpPage: React.FC = () => {
  const helpSections = [
    {
      id: 'getting-started',
      title: 'はじめに',
      icon: 'play' as const,
      items: [
        {
          title: 'TradingViewer の概要',
          content:
            'TradingViewer は本格的な金融チャート分析プラットフォームです。リアルタイムの市場データ、テクニカル分析ツール、描画機能を提供します。',
        },
        {
          title: 'アカウント作成',
          content:
            '右上の「ログイン」ボタンから新規アカウントを作成できます。メールアドレスとパスワードを入力してください。',
        },
        {
          title: 'プラットフォームの基本操作',
          content:
            '左のナビゲーションメニューから各機能にアクセスできます。モバイル版では画面下部のタブからナビゲーションします。',
        },
      ],
    },
    {
      id: 'charts',
      title: 'チャート機能',
      icon: 'chart' as const,
      items: [
        {
          title: 'チャートの表示',
          content:
            '「Charts」ページでは全画面でチャートを表示できます。銘柄検索、時間軸変更、インディケーター追加が可能です。',
        },
        {
          title: '描画ツール',
          content:
            'トレンドライン、水平線、フィボナッチなどの描画ツールを使って分析できます。左側のツールバーから選択してください。',
        },
        {
          title: 'テクニカル指標',
          content:
            'SMA、EMA、RSI、MACD、ボリンジャーバンドなどの指標を追加できます。チャート上部のインディケーターボタンからどうぞ。',
        },
        {
          title: 'アラート設定',
          content:
            '価格アラートや指標アラートを設定できます。右クリックメニューまたはアラートページから設定してください。',
        },
      ],
    },
    {
      id: 'market',
      title: 'マーケット情報',
      icon: 'trending' as const,
      items: [
        {
          title: 'リアルタイム市場データ',
          content:
            '「Market」ページでは主要な株価指数、通貨ペア、商品の現在価格とチャートを確認できます。',
        },
        {
          title: 'ニュース機能',
          content:
            '市場に関連するニュースを確認できます。重要なニュースは価格変動と合わせて表示されます。',
        },
        {
          title: '銘柄分析',
          content: '各銘柄の詳細情報、パフォーマンス、関連ニュースを確認できます。',
        },
      ],
    },
    {
      id: 'watchlist',
      title: 'ウォッチリスト',
      icon: 'heart' as const,
      items: [
        {
          title: 'お気に入り銘柄',
          content: '注目している銘柄をウォッチリストに追加して、価格変動を一覧で確認できます。',
        },
        {
          title: '追加・削除',
          content: '銘柄検索から「+」ボタンでウォッチリストに追加、「×」ボタンで削除できます。',
        },
        {
          title: 'ソート・フィルタ',
          content: '価格変動率、時価総額などでソートしたり、セクター別にフィルタできます。',
        },
      ],
    },
    {
      id: 'search',
      title: '検索機能',
      icon: 'search' as const,
      items: [
        {
          title: '銘柄検索',
          content:
            '銘柄名、ティッカーシンボル、企業名で株式を検索できます。リアルタイムの検索候補が表示されます。',
        },
        {
          title: '高度な検索',
          content: 'セクター、市場、価格帯などの条件で絞り込み検索ができます。',
        },
        {
          title: '検索履歴',
          content: '最近検索した銘柄の履歴が保存され、素早くアクセスできます。',
        },
      ],
    },
    {
      id: 'alerts',
      title: 'アラート機能',
      icon: 'bell' as const,
      items: [
        {
          title: '価格アラート',
          content: '指定した価格に到達した際に通知を受け取れます。上値・下値の両方設定可能です。',
        },
        {
          title: 'テクニカルアラート',
          content: 'RSI の過買い・過売り、MACD クロスオーバーなどの条件でアラートを設定できます。',
        },
        {
          title: '通知設定',
          content: 'ブラウザ通知、メール通知などの受信方法を選択できます。',
        },
      ],
    },
    {
      id: 'settings',
      title: '設定',
      icon: 'settings' as const,
      items: [
        {
          title: 'アカウント設定',
          content: 'プロフィール情報、パスワード変更、セキュリティ設定を管理できます。',
        },
        {
          title: 'チャート設定',
          content: 'デフォルトの時間軸、色設定、描画ツールの設定をカスタマイズできます。',
        },
        {
          title: 'テーマ設定',
          content:
            'ライトテーマ・ダークテーマを切り替えできます。システム設定に合わせることも可能です。',
        },
        {
          title: '通知設定',
          content: 'アラート通知の受信設定、音声通知のオン・オフを設定できます。',
        },
      ],
    },
  ]

  const shortcuts = [
    { key: 'Ctrl + K', description: '銘柄検索' },
    { key: 'Ctrl + D', description: 'ダークテーマ切り替え' },
    { key: 'Ctrl + /', description: 'ヘルプ表示' },
    { key: '1-9', description: '時間軸変更' },
    { key: 'L', description: 'トレンドライン' },
    { key: 'H', description: '水平線' },
    { key: 'F', description: 'フィボナッチ' },
    { key: 'Esc', description: '描画モード解除' },
  ]

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-4'>ヘルプセンター</h1>
          <p className='text-xl text-gray-600 dark:text-gray-300'>
            TradingViewer の使い方とよくある質問
          </p>
        </div>

        {/* Quick Search */}
        <div className='mb-12'>
          <div className='relative'>
            <input
              type='text'
              placeholder='ヘルプを検索...'
              className='w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
            <Icon
              name='search'
              className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400'
              size={20}
              color='currentColor'
            />
          </div>
        </div>

        {/* Help Sections */}
        <div className='space-y-8 mb-12'>
          {helpSections.map(section => (
            <div key={section.id} className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6'>
              <div className='flex items-center mb-6'>
                <Icon
                  name={section.icon}
                  className='text-blue-600 dark:text-blue-400 mr-3'
                  size={24}
                  color='currentColor'
                />
                <h2 className='text-2xl font-semibold text-gray-900 dark:text-white'>
                  {section.title}
                </h2>
              </div>
              <div className='space-y-4'>
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className='border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0'
                  >
                    <h3 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                      {item.title}
                    </h3>
                    <p className='text-gray-600 dark:text-gray-300'>{item.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Keyboard Shortcuts */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-12'>
          <div className='flex items-center mb-6'>
            <Icon
              name='keyboard'
              className='text-purple-600 dark:text-purple-400 mr-3'
              size={24}
              color='currentColor'
            />
            <h2 className='text-2xl font-semibold text-gray-900 dark:text-white'>
              キーボードショートカット
            </h2>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
              >
                <span className='text-gray-900 dark:text-white'>{shortcut.description}</span>
                <kbd
                  className='px-2 py-1 text-sm font-semibold text-gray-800 dark:text-gray-200 
                              bg-gray-200 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 
                              rounded-lg shadow-sm'
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
