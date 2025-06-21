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
  currentVoiceChannelId: string | null
  messages: Message[]
  users: User[]
}

export interface AuthState {
  isAuthenticated: boolean
  accessToken: string | null
  isLoading: boolean
  error: string | null
}

export interface AppContextType extends AppState {
  setCurrentServer: (serverId: string) => void
  setCurrentChannel: (channelId: string) => void
  sendMessage: (content: string) => void
  editMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
  joinVoiceChannel: (channelId: string) => void
  leaveVoiceChannel: () => void
  isMuted: boolean
  toggleMute: () => void
  muteVoiceChannel: () => void
  unmuteVoiceChannel: () => void
  isScreenSharing: boolean
  startScreenShare: () => void
  stopScreenShare: () => void
  isWatchingScreen: boolean
  screenVideoStream: MediaStream | null
  startWatchingScreen: () => void
  stopWatchingScreen: () => void
  auth: AuthState
  login: () => void
  logout: () => void
}
