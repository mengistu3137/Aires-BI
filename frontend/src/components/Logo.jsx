import logoIcon from '@/assets/logo.png'
import logoFull from '@/assets/yemiflow.png'

const Logo = ({ className = '', size = 'md', showName = true, ...props }) => {
  const sizes = {
    sm: {
      mark: 'h-8 w-8',
      fullHeight: 'h-8',
    },
    md: {
      mark: 'h-10 w-10',
      fullHeight: 'h-10',
    },
    lg: {
      mark: 'h-12 w-12',
      fullHeight: 'h-12',
    },
  }

  const currentSize = sizes[size] || sizes.md

  // The wordmark and tagline are now baked into the logo artwork itself,
  // so when showName is true we render the full lockup image directly
  // instead of composing separate text spans.
  if (showName) {
    return (
      <div className={`inline-flex items-center select-none ${className}`} {...props}>
        <img
          src={logoFull}
          alt="Keron"
          className={`${currentSize.fullHeight} w-auto object-contain`}
        />
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`} {...props}>
      <div
        className={`
          ${currentSize.mark}
          relative shrink-0 overflow-hidden
          rounded-xl
          bg-white
          ring-1 ring-primary-100/70
          shadow-soft
          transition-all duration-300
          group-hover:shadow-glow
        `}
      >
        <img
          src={logoIcon}
          alt="Keron"
          className="absolute inset-0 h-full w-full object-contain p-1"
        />
      </div>
    </div>
  )
}

export default Logo
