import {
  Link,
  Navigate,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { useAdminAuth } from './providers/AdminAuthProvider'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PostsPage } from './pages/PostsPage'
import { CommentsPage } from './pages/CommentsPage'
import { TaxonomyPage } from './pages/TaxonomyPage'
import { MediaPage } from './pages/MediaPage'
import { BookmarksPage } from './pages/BookmarksPage'
import { ThoughtsPage } from './pages/ThoughtsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { AdminShell } from './components/AdminShell'

function RootLayout() {
  return <Outlet />
}

function ProtectedLayout() {
  const { checked, isAuthenticated } = useAdminAuth()

  if (!checked) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading admin...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}

function LoginRouteGuard() {
  const { checked, isAuthenticated } = useAdminAuth()
  if (!checked) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading admin...</div>
  }
  if (isAuthenticated) {
    return <Navigate to="/" />
  }
  return <LoginPage />
}

function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-slate-100">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300">Admin</p>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <Link className="inline-flex rounded-xl bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950" to="/">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginRouteGuard,
})

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/',
  component: DashboardPage,
})

const postsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/posts',
  component: PostsPage,
})

const commentsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/comments',
  component: CommentsPage,
})

const bookmarksRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/bookmarks',
  component: BookmarksPage,
})

const thoughtsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/thoughts',
  component: ThoughtsPage,
})

const projectsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/projects',
  component: ProjectsPage,
})

const taxonomyRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/taxonomy',
  component: TaxonomyPage,
})

const mediaRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: '/media',
  component: MediaPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    dashboardRoute,
    postsRoute,
    commentsRoute,
    bookmarksRoute,
    thoughtsRoute,
    projectsRoute,
    taxonomyRoute,
    mediaRoute,
  ]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
