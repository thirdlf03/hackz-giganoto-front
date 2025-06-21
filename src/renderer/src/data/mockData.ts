import { v4 as uuidv4 } from 'uuid'
import { User, Server, Message } from '../types'

export const mockCurrentUser: User = {
  id: uuidv4(),
  username: 'あなた',
  status: 'online',
  avatar: undefined
}

export const mockUsers: User[] = [
  mockCurrentUser,
  {
    id: uuidv4(),
    username: 'Alice',
    status: 'online',
    avatar: undefined
  },
  {
    id: uuidv4(),
    username: 'Bob',
    status: 'away',
    avatar: undefined
  },
  {
    id: uuidv4(),
    username: 'Charlie',
    status: 'busy',
    avatar: undefined
  },
  {
    id: uuidv4(),
    username: 'Diana',
    status: 'offline',
    avatar: undefined
  },
  {
    id: uuidv4(),
    username: 'Discord Bot',
    status: 'online',
    isBot: true,
    avatar: undefined
  }
]

export const mockServers: Server[] = [
  {
    id: uuidv4(),
    name: 'メインサーバー',
    icon: undefined,
    channels: [
      {
        id: uuidv4(),
        name: '一般',
        type: 'text',
        serverId: '',
        unreadCount: 3
      },
      {
        id: uuidv4(),
        name: 'お知らせ',
        type: 'text',
        serverId: '',
        unreadCount: 0
      },
      {
        id: uuidv4(),
        name: 'ランダム',
        type: 'text',
        serverId: '',
        unreadCount: 1
      },
      {
        id: uuidv4(),
        name: 'ボイスチャット',
        type: 'voice',
        serverId: ''
      }
    ]
  },
  {
    id: uuidv4(),
    name: 'ゲームサーバー',
    icon: undefined,
    channels: [
      {
        id: uuidv4(),
        name: 'ゲーム雑談',
        type: 'text',
        serverId: '',
        unreadCount: 0
      },
      {
        id: uuidv4(),
        name: 'ゲーム実況',
        type: 'voice',
        serverId: ''
      }
    ]
  },
  {
    id: uuidv4(),
    name: '学習グループ',
    icon: undefined,
    channels: [
      {
        id: uuidv4(),
        name: 'プログラミング',
        type: 'text',
        serverId: '',
        unreadCount: 2
      },
      {
        id: uuidv4(),
        name: '勉強会',
        type: 'voice',
        serverId: ''
      }
    ]
  }
]

mockServers.forEach((server) => {
  server.channels.forEach((channel) => {
    channel.serverId = server.id
  })
})

export const mockMessages: Message[] = [
  {
    id: uuidv4(),
    content: 'こんにちは！みなさん調子はどうですか？',
    author: mockUsers[1], // Alice
    timestamp: new Date(Date.now() - 3600000), // 1時間前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content: '元気です！今日は良い天気ですね ☀️',
    author: mockUsers[2], // Bob
    timestamp: new Date(Date.now() - 3300000), // 55分前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content: 'そうですね！散歩に出かけたくなります',
    author: mockUsers[3], // Charlie
    timestamp: new Date(Date.now() - 3000000), // 50分前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content: '新しい機能について相談があります。時間があるときに教えてください！',
    author: mockUsers[1], // Alice
    timestamp: new Date(Date.now() - 2700000), // 45分前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content: 'もちろんです！どんなことでしょうか？',
    author: mockCurrentUser,
    timestamp: new Date(Date.now() - 2400000), // 40分前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content:
      'ReactのuseEffectについて質問があります。依存配列の使い方がいまいち理解できていません...',
    author: mockUsers[1], // Alice
    timestamp: new Date(Date.now() - 2100000), // 35分前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content:
      'useEffectは副作用を扱うフックですね！依存配列には、エフェクト内で使用する変数を指定します。空の配列だとマウント時のみ実行されます。',
    author: mockUsers[2], // Bob
    timestamp: new Date(Date.now() - 1800000), // 30分前
    channelId: mockServers[0].channels[0].id
  },
  {
    id: uuidv4(),
    content: 'なるほど！ありがとうございます。とても分かりやすい説明です 👍',
    author: mockUsers[1], // Alice
    timestamp: new Date(Date.now() - 1500000), // 25分前
    channelId: mockServers[0].channels[0].id,
    edited: true,
    editedTimestamp: new Date(Date.now() - 1200000) // 20分前に編集
  },
  {
    id: uuidv4(),
    content:
      'サーバーメンテナンスのお知らせ：明日の午前2時から4時まで、一時的にサービスが利用できません。ご迷惑をおかけします。',
    author: mockUsers[5], // Discord Bot
    timestamp: new Date(Date.now() - 900000), 
    channelId: mockServers[0].channels[1].id
  },
  {
    id: uuidv4(),
    content: '今日のランチはラーメン🍜にしました！',
    author: mockUsers[3], // Charlie
    timestamp: new Date(Date.now() - 600000),
    channelId: mockServers[0].channels[2].id
  }
]
