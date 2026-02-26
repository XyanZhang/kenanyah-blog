export type NavHref = '/' | '/blog' | '/about' | '/photography' | '/pictures' | '/projects'

export interface NavItem {
  id: string
  label: string
  href: NavHref
  icon: string
}

export const navItems: NavItem[] = [
  { id: 'home', label: '首页', href: '/', icon: 'Home' },
  { id: 'blog', label: '博客', href: '/blog', icon: 'FileText' },
  { id: 'about', label: '关于', href: '/about', icon: 'User' },
  { id: 'photography', label: '摄影', href: '/photography', icon: 'Camera' },
  { id: 'pictures', label: '图片', href: '/pictures', icon: 'Images' },
  { id: 'projects', label: '项目', href: '/projects', icon: 'FolderOpen' },
]
