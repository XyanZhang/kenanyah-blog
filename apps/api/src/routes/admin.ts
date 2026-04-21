import { Hono } from 'hono'
import adminAuth from './admin-auth'
import adminDashboard from './admin-dashboard'
import adminPosts from './admin-posts'
import adminComments from './admin-comments'
import adminCategories from './admin-categories'
import adminTags from './admin-tags'
import adminMedia from './admin-media'

const admin = new Hono()

admin.route('/auth', adminAuth)
admin.route('/dashboard', adminDashboard)
admin.route('/posts', adminPosts)
admin.route('/comments', adminComments)
admin.route('/categories', adminCategories)
admin.route('/tags', adminTags)
admin.route('/media', adminMedia)

export default admin
