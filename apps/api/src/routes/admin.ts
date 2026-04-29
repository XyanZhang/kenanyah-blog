import { Hono } from 'hono'
import adminAuth from './admin-auth'
import adminDashboard from './admin-dashboard'
import adminPosts from './admin-posts'
import adminComments from './admin-comments'
import adminCategories from './admin-categories'
import adminTags from './admin-tags'
import adminMedia from './admin-media'
import adminBookmarks from './admin-bookmarks'
import adminThoughts from './admin-thoughts'
import adminProjects from './admin-projects'

const admin = new Hono()

admin.route('/auth', adminAuth)
admin.route('/dashboard', adminDashboard)
admin.route('/posts', adminPosts)
admin.route('/comments', adminComments)
admin.route('/categories', adminCategories)
admin.route('/tags', adminTags)
admin.route('/media', adminMedia)
admin.route('/bookmarks', adminBookmarks)
admin.route('/thoughts', adminThoughts)
admin.route('/projects', adminProjects)

export default admin
