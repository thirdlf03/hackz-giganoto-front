import React from 'react'
import { AppProvider, useAppContext } from './context/AppContext'
import ServerList from './components/Sidebar/ServerList'
import ChannelList from './components/Sidebar/ChannelList'
import ChatArea from './components/Chat/ChatArea'
import UserList from './components/UserList/UserList'
import UserInfo from './components/UserInfo/UserInfo'
import LoginScreen from './components/Auth/LoginScreen'
import './styles/discord.css'

const DiscordApp: React.FC = () => {
  const {
    auth,
    servers,
    currentServerId,
    currentChannelId,
    messages,
    users,
    currentUser,
    setCurrentServer,
    setCurrentChannel,
    sendMessage
  } = useAppContext()



  const currentServer = servers.find((server) => server.id === currentServerId) || null
  const currentChannel =
    currentServer?.channels.find((channel) => channel.id === currentChannelId) || null

  return (
    <div className="discord-app">
      <ServerList
        servers={servers}
        currentServerId={currentServerId}
        onServerSelect={setCurrentServer}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <ChannelList
          server={currentServer}
          currentChannelId={currentChannelId}
          onChannelSelect={setCurrentChannel}
        />
        <UserInfo user={currentUser} />
      </div>
      <ChatArea channel={currentChannel} messages={messages} onSendMessage={sendMessage} />
      <UserList users={users} />
    </div>
  )
}

function App(): React.JSX.Element {
  return (
    <AppProvider>
      <DiscordApp />
    </AppProvider>
  )
}

export default App
