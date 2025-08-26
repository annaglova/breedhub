import { useState, useEffect } from 'react'
import { X, ExternalLink, Maximize2, Minimize2 } from 'lucide-react'

interface JsonHeroViewerProps {
  json: any
  title?: string
  onClose?: () => void
}

export function JsonHeroViewer({ json, title = "JSON Preview", onClose }: JsonHeroViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [jsonHeroUrl, setJsonHeroUrl] = useState('')

  useEffect(() => {
    const jsonString = JSON.stringify(json, null, 2)
    const encodedJson = btoa(unescape(encodeURIComponent(jsonString)))
    setJsonHeroUrl(`https://jsonhero.io/new?j=${encodedJson}`)
  }, [json])

  const openInNewTab = () => {
    window.open(jsonHeroUrl, '_blank')
  }

  return (
    <div className={`fixed ${isFullscreen ? 'inset-0' : 'inset-4 lg:inset-8'} bg-black/50 flex items-center justify-center z-50`}>
      <div className={`bg-background border rounded-lg ${isFullscreen ? 'w-full h-full' : 'w-full max-w-6xl h-[80vh]'} flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={openInNewTab}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={jsonHeroUrl}
            className="w-full h-full border-0"
            title="JSON Hero Viewer"
            allow="clipboard-write"
          />
        </div>
      </div>
    </div>
  )
}