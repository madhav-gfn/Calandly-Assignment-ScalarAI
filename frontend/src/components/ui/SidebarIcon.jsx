export default function SidebarIcon({ name }) {
  switch (name) {
    case 'calendar':
      return <span className="icon-glyph">▦</span>;
    case 'clock':
      return <span className="icon-glyph">◷</span>;
    case 'users':
      return <span className="icon-glyph">◔</span>;
    case 'spark':
      return <span className="icon-glyph">✦</span>;
    case 'grid':
      return <span className="icon-glyph">⊞</span>;
    case 'swap':
      return <span className="icon-glyph">⇄</span>;
    case 'chart':
      return <span className="icon-glyph">◫</span>;
    case 'shield':
      return <span className="icon-glyph">⬡</span>;
    case 'search':
      return <span className="icon-glyph">⌕</span>;
    case 'link':
      return <span className="icon-glyph">↗</span>;
    default:
      return <span className="icon-glyph">•</span>;
  }
}
