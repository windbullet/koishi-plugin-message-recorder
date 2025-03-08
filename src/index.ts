import { Context, Schema, Session } from 'koishi'

export const name = 'message-recorder'

export interface Config {
  maxMessages: number
}

export const Config: Schema<Config> = Schema.object({
  maxMessages: Schema.number()
    .default(10)
    .description("单个群消息储存在缓存中的最大条数")
})

interface Recorder {
  _messages: Messages
  add(session: Session, maxMessages: number): void
  get(channelId: string, count: number): Message[]
}

interface Messages {
  [channelId: string]: Message[]
}

interface Message {
  channelId: string
  userId: string
  username: string
  userAvatar: string
  content: string
}

class Message {
  constructor(session: Session) {
    this.channelId = session.channelId
    this.userId = session.userId
    this.username = session.username
    this.userAvatar = session.event.user.avatar
    this.content = session.content
  }
}

export function apply(ctx: Context, config: Config) {
  const recorder: Recorder =  {
    _messages: {},

    add(session: Session, maxMessages: number) {
      const { channelId } = session
      const messages = this._messages[channelId] || []

      if (messages.length >= maxMessages + 1) {
        messages.shift()
      }
      messages.push(new Message(session))

      this._messages[channelId] = messages
    },

    get(channelId: string, count: number) {
      return this._messages[channelId].slice(-count-1, -1)
    }
  }

  ctx.on("message", (session) => {
    recorder.add(session, config.maxMessages)
  })

  ctx.command("message-records [count:posint]", "查看本群最近数条消息记录")
    .alias("查看消息记录")
    .action(async ({session}, count) => {
      let result = `<message forward>`
      
      recorder.get(session.channelId, count ?? 10).forEach((message) => {
        result +=`<message>
<author id="${message.userId}" name="${message.username}" avatar="${message.userAvatar}"/>
${message.content}
  </message>`
      })

      result += `</message>`
      
      return result
    })
}
