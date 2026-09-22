import { useEffect, useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

const ZOOM_STEP = 0.2
const MIN_ZOOM = 0.6
const MAX_ZOOM = 3

export function ReceiptViewerModal({
  isOpen,
  imageUrl,
  title = 'Receipt Image',
  onClose,
  enableDownload = true,
}) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!isOpen) {
      setZoom(1)
    }
  }, [isOpen])

  const zoomIn = () => setZoom((current) => Math.min(current + ZOOM_STEP, MAX_ZOOM))
  const zoomOut = () => setZoom((current) => Math.max(current - ZOOM_STEP, MIN_ZOOM))
  const resetZoom = () => setZoom(1)

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-text-primary/30" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="glass-panel w-full max-w-4xl p-4 shadow-soft-xl sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="text-lg font-semibold text-text-primary">{title}</DialogTitle>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="rounded-2xl border border-primary-100/70 px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-primary-50/70"
              >
                -
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-2xl border border-primary-100/70 px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-primary-50/70"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="rounded-2xl border border-primary-100/70 px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-primary-50/70"
              >
                +
              </button>

              {enableDownload && imageUrl ? (
                <a
                  href={imageUrl}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                >
                  Download
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-2xl border border-primary-100/70 bg-primary-50/60 p-2 sm:p-3">
            {imageUrl ? (
              <div className="flex min-h-[45vh] items-center justify-center sm:min-h-[60vh]">
                <img
                  src={imageUrl}
                  alt="Payment receipt"
                  className="max-h-[70vh] w-auto max-w-full origin-center object-contain transition-transform duration-150"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>
            ) : (
              <p className="p-6 text-sm text-text-secondary">No receipt image available.</p>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-primary-100/70 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-primary-50/70"
            >
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
