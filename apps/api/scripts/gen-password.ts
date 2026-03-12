/**
 * 生成密码哈希脚本
 * 用法: pnpm --filter api gen-password <password>
 * 或者: tsx scripts/gen-password.ts <password>
 */
import { hash } from 'bcrypt'

async function main() {
  const password = process.argv[2]

  if (!password) {
    console.log('用法: pnpm --filter api gen-password <password>')
    console.log('示例: pnpm --filter api gen-password MyPassword123')
    process.exit(1)
  }

  // 验证密码复杂度
  if (password.length < 8) {
    console.log('❌ 密码至少 8 个字符')
    process.exit(1)
  }
  if (!/[A-Z]/.test(password)) {
    console.log('❌ 密码必须包含至少一个大写字母')
    process.exit(1)
  }
  if (!/[a-z]/.test(password)) {
    console.log('❌ 密码必须包含至少一个小写字母')
    process.exit(1)
  }
  if (!/[0-9]/.test(password)) {
    console.log('❌ 密码必须包含至少一个数字')
    process.exit(1)
  }

  const hashRounds = 10
  const passwordHash = await hash(password, hashRounds)

  console.log('\n✅ 密码哈希生成成功:\n')
  console.log(passwordHash)
  console.log('\n📝 SQL 更新语句:')
  console.log(`UPDATE users SET password_hash = '${passwordHash}' WHERE email = 'your-email@example.com';`)
  console.log('\n或者使用 Prisma Studio 直接编辑用户记录。')
}

main().catch(console.error)