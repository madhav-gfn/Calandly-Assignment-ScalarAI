import {
  CalendarDays,
  Clock,
  Users,
  Zap,
  LayoutGrid,
  ArrowRightLeft,
  BarChart2,
  ShieldCheck,
  Search,
  Link,
  ChevronRight
} from 'lucide-react';

export default function SidebarIcon({ name, ...props }) {
  const iconProps = { className: "icon-glyph", size: 20, strokeWidth: 1.5, ...props };

  switch (name) {
    case 'calendar':
      return <CalendarDays {...iconProps} />;
    case 'clock':
      return <Clock {...iconProps} />;
    case 'users':
      return <Users {...iconProps} />;
    case 'spark':
      return <Zap {...iconProps} />;
    case 'grid':
      return <LayoutGrid {...iconProps} />;
    case 'swap':
      return <ArrowRightLeft {...iconProps} />;
    case 'chart':
      return <BarChart2 {...iconProps} />;
    case 'shield':
      return <ShieldCheck {...iconProps} />;
    case 'search':
      return <Search {...iconProps} />;
    case 'link':
      return <Link {...iconProps} />;
    case 'chevronRight':
      return <ChevronRight {...iconProps} />;
    default:
      return <span className="icon-glyph w-5 h-5 flex items-center justify-center">•</span>;
  }
}
