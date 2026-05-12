const names = ['青禾', '墨白', '林间', '南栀', '望舒', '清越', '澄明', '砚秋']
const colors = ['#c24162', '#2f6f73', '#8b5e34', '#5b6c9d', '#8f4c38', '#486b42', '#7a5b92', '#b35c24']

export function getLocalUser() {
  const cached = window.localStorage.getItem('collab-editor-user')
  if (cached) {
    return JSON.parse(cached) as { name: string; color: string }
  }

  const index = Math.floor(Math.random() * names.length)
  const user = {
    name: `${names[index]} ${Math.floor(Math.random() * 90 + 10)}`,
    color: colors[index % colors.length],
  }
  window.localStorage.setItem('collab-editor-user', JSON.stringify(user))
  return user
}
