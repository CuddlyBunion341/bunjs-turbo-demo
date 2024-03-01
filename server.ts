import { ServerWebSocket } from "bun";

const layout = (title: string, content: string, options: {clientId: string, username: string}) => `
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
      <script src="./client.js" defer></script>
      <script type="module">
        import hotwiredTurbo from 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.3/+esm'
      </script>
      <turbo-stream-source src="ws://localhost:${port}/subscribe?clientId=${options.clientId}&username=${options.username}" />
      <turbo-cable-stream-source channel="Turbo::StreamsChannel" signed-stream-name"STREAM-${Math.random()}" />
    </head>
    <body>
      <header>
        <h1>Turbo Streams</h1>
        <p>Bring your application to live with turbo streams!</p>
      </header>
      <h2>${title}</h2>
      ${content}
    </body>
  </html>
`

const messageHTML = (message: string) => `
    <p class="notice">
      <code>
        ${message}
      </code>
    </p>
`

const ownMessageHTML = (message: string) => `
  <p class="notice">
    ${message}
  </p>
`

const streamHTML = (content: string, options = { action: "append", target: "chat-feed" }) => `
  <turbo-stream action="${options.action}" target="${options.target}">
    <template>
      ${content}
    </template>
  </turbo-stream>
`

const streamMessage = (message: string, own: boolean, streamOptions = { action: "append", target: "chat-feed" }) =>
  streamHTML(own ? ownMessageHTML(message) : messageHTML(message), streamOptions)

const chatRoomHTML = (clientId: string) => `
  <p>This is a chatroom</p>
  <mark id="connection-status">Connecting...</mark>
  <div id="chat-feed">
  </div>
  <form id="chat-form" action="/submit" method="post">
    <label for="message-input">Message</label>
    <input id="message-input" name="message" required>
    <input type="hidden" name="clientId" value="${clientId}">
    <input type="submit" value="Send">
  </form>
`


const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const generateUsername = () => {
  const adjectives = ["Red", "Green", "Blue", "Yellow", "Purple", "Orange", "Pink", "Black", "White", "Grey"]
  const nouns = ["Dog", "Cat", "Bird", "Fish", "Lion", "Tiger", "Bear", "Elephant", "Monkey", "Giraffe"]
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 100)}`
}

const generateUniqueUsername = (users: Record<ClientId, Username>) => {
  const usernames = Object.values(users)
  while(true) {
    const username = generateUsername()
    const userExists = usernames.find(user => user === username) !== undefined
    if (!userExists) return username
  }
}

const topic = "my-topic";

type ClientId = string
type Username = string

const users: Record<ClientId, Username> = {}
const port = 8080

type ServerData = { username: string }

const sockets: ServerWebSocket<ServerData>[] = []

Bun.serve<ServerData>({
  port,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/subscribe") {
      const clientId = url.searchParams.get("clientId")
      if (!clientId) return new Response("Invalid clientId", { status: 400 })

      let username = url.searchParams.get("username")
      if (!username) username = generateUniqueUsername(users)

      users[clientId] = username

      if (server.upgrade(req, { data: { username } })) { return }
      return new Response("Could not upgrade", { status: 500 })
    }

    if (url.pathname === "/submit") {
      const formData = await req.formData()
      const message = formData.get("message")
      const clientId = formData.get("clientId")
      if (typeof clientId !== "string") return new Response("Invalid clientId", { status: 400 })

      const username = users[clientId]

      if (typeof message !== "string" || message.trim() === "") return new Response("Invalid message", { status: 400 })

      sockets.forEach(socket => {
        socket.send(streamMessage(`${username}: ${message}`, socket.data.username === username))
      })

      return new Response("", { status: 204 })
    }

    if (url.pathname === "/") {
      const clientId = generateUUID()
      const username = generateUniqueUsername(users)
      return new Response(layout("ChatRoom", chatRoomHTML(clientId), {clientId, username}), { headers: { "Content-Type": "text/html" }})
    }

    if (url.pathname === "/client.js") return new Response(Bun.file("./client.js"), { headers: { "Content-Type": "text/javascript" } });
    return new Response("404!");
  },
  websocket: {
    open(ws) {
      ws.subscribe(topic)
      sockets.push(ws)
      sockets.forEach(socket => {
        socket.send(streamMessage(`${ws.data.username} joined the chat`, socket.data.username === ws.data.username))
      })
    },
    message(ws, message) { },
    close(ws) {
      sockets.forEach(socket => {
        socket.send(streamMessage(`${ws.data.username} left the chat`, socket.data.username === ws.data.username))
      })
      ws.unsubscribe(topic)
      const socketIndex = sockets.indexOf(ws)
      if (socketIndex > -1) {
        sockets.splice(socketIndex, 1)
      }
    },
    publishToSelf: true
  }
});

console.log(`Bun is running on http://localhost:${port}`)
