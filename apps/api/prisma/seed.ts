import { PrismaClient } from '@prisma/client'
import { generateSlug } from '@blog/utils'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@blog.com' },
    update: {},
    create: {
      email: 'admin@blog.com',
      username: 'admin',
      passwordHash: adminPasswordHash,
      name: 'Admin User',
      bio: 'Blog administrator',
      role: 'ADMIN',
    },
  })

  console.log('Created admin user:', admin.username)

  // Create regular user
  const userPasswordHash = await bcrypt.hash('user123', 10)
  const user = await prisma.user.upsert({
    where: { email: 'user@blog.com' },
    update: {},
    create: {
      email: 'user@blog.com',
      username: 'johndoe',
      passwordHash: userPasswordHash,
      name: 'John Doe',
      bio: 'Regular blog user',
      role: 'USER',
    },
  })

  console.log('Created regular user:', user.username)

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'technology' },
      update: {},
      create: {
        slug: 'technology',
        name: 'Technology',
        description: 'Tech news and tutorials',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'programming' },
      update: {},
      create: {
        slug: 'programming',
        name: 'Programming',
        description: 'Programming languages and best practices',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'web-development' },
      update: {},
      create: {
        slug: 'web-development',
        name: 'Web Development',
        description: 'Frontend and backend web development',
      },
    }),
  ])

  console.log('Created categories:', categories.length)

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { slug: 'javascript' },
      update: {},
      create: { slug: 'javascript', name: 'JavaScript' },
    }),
    prisma.tag.upsert({
      where: { slug: 'typescript' },
      update: {},
      create: { slug: 'typescript', name: 'TypeScript' },
    }),
    prisma.tag.upsert({
      where: { slug: 'react' },
      update: {},
      create: { slug: 'react', name: 'React' },
    }),
    prisma.tag.upsert({
      where: { slug: 'nodejs' },
      update: {},
      create: { slug: 'nodejs', name: 'Node.js' },
    }),
  ])

  console.log('Created tags:', tags.length)

  // Create sample posts
  const postSlug = generateSlug('Getting Started with TypeScript')
  const existingPost = await prisma.post.findUnique({ where: { slug: postSlug } })

  if (!existingPost) {
    const post1 = await prisma.post.create({
      data: {
        slug: postSlug,
        title: 'Getting Started with TypeScript',
        excerpt: 'Learn the basics of TypeScript and why you should use it',
        content: 'TypeScript is a typed superset of JavaScript...',
        published: true,
        publishedAt: new Date(),
        authorId: admin.id,
        categories: {
          create: [
            { categoryId: categories[1].id },
          ],
        },
        tags: {
          create: [
            { tagId: tags[1].id },
          ],
        },
      },
    })
    console.log('Created post:', post1.title)
  } else {
    console.log('Post already exists:', existingPost.title)
  }

  console.log('Database seed completed!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
