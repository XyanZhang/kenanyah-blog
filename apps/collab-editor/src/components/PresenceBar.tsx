import { Wifi, WifiOff } from 'lucide-react'
import type { ConnectionStatus } from '../types'
import type { OnlineUser } from '../hooks/useOnlineUsers'

type PresenceBarProps = {
  users: OnlineUser[]
  status: ConnectionStatus
}

export function PresenceBar({ users, status }: PresenceBarProps) {
  const statusText = {
    connecting: '连接中',
    connected: '已同步',
    disconnected: '离线',
  }[status]

  return (
    <div className="presence-bar">
      <div className={`connection-pill ${status}`}>
        {status === 'disconnected' ? <WifiOff size={15} /> : <Wifi size={15} />}
        {statusText}
      </div>

      <div className="avatars" aria-label="在线协作者">
        {users.length === 0 ? <span className="avatar empty">你</span> : null}
        {users.slice(0, 5).map((user) => (
          <span className="avatar" key={user.clientId} style={{ background: user.color }} title={user.name}>
            {user.name.slice(0, 1)}
          </span>
        ))}
        <span className="online-count">{users.length} 人在线</span>
      </div>
    </div>
  )
}
