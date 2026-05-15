export default function BaekseokLogo({ size = 'md', dark = false }) {
  const sizes = {
    sm: { img: 'h-8',  title: 'text-sm',  sub: 'text-xs' },
    md: { img: 'h-12', title: 'text-base', sub: 'text-xs' },
    lg: { img: 'h-16', title: 'text-xl',   sub: 'text-sm' },
  }
  const s = sizes[size] || sizes.md
  const textColor = dark ? 'text-white' : 'text-slate-800'
  const subColor  = dark ? 'text-blue-200' : 'text-slate-500'

  return (
    <div className="flex items-center gap-3">
      {/* 로고 이미지 — 실제 로고 파일을 /public/logo.png 에 넣으면 자동 표시 */}
      <img
        src="/logo.png"
        alt="Baekseok University"
        className={`${s.img} object-contain`}
        onError={e => { e.target.style.display = 'none' }}
      />
      <div>
        <p className={`font-bold leading-tight ${s.title} ${textColor}`}>백석대학교</p>
        <p className={`leading-tight ${s.sub} ${subColor}`}>Baekseok University</p>
      </div>
    </div>
  )
}
