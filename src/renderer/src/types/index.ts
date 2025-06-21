export interface User {
  id: string
  username: string
  avatar?: string
  status: 'online' | 'away' | 'busy' | 'offline'
  isBot?: boolean
  githubId?: number
  githubUsername?: string
}

export interface Server {
  id: string
  name: string
  icon?: string
  channels: Channel[]
}

export interface Channel {
  id: string
  name: string
  type: 'text' | 'voice'
  serverId: string
  unreadCount?: number
}

export interface Message {
  id: string
  content: string
  author: User
  timestamp: Date
  channelId: string
  edited?: boolean
  editedTimestamp?: Date
  attachments?: Attachment[]
}

export interface Attachment {
  id: string
  filename: string
  url: string
  size: number
  contentType: string
}

export interface AppState {
  currentUser: User | null
  servers: Server[]
  currentServerId: string | null
  currentChannelId: string | null
  messages: Message[]
  users: User[]
}

export interface GitHubUser {
  id: number
  login: string
  avatar_url: string
  name: string | null
  email: string | null
  bio: string | null
}

export interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
  githubUser: GitHubUser | null
  isLoading: boolean
  error: string | null
}

export interface AppContextType extends AppState {
  setCurrentServer: (serverId: string) => void
  setCurrentChannel: (channelId: string) => void
  sendMessage: (content: string) => void
  editMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
  isMuted: boolean
  toggleMute: () => void
  // 認証関連
  auth: AuthState
  login: () => void
  logout: () => void
}
