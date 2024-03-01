import { ServerWebSocket } from "bun";

const layout = (title: string, content: string) => `
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
      <script src="./client.js" defer></script>
      <script type="module">
        import hotwiredTurbo from 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.3/+esm'
      </script>
      <turbo-stream-source src="ws://localhost:${port}/subscribe" />
      <turbo-cable-stream-source channel="Turbo::StreamsChannel" signed-stream-name"STREAM-${Math.random()}" />
    </head>
    <body>
      <header>
        <h1>Turbo Streams</h1>
        <p>Bring your application to live with turbo streams!</p>
      </header>
      <h1>${title}</h1>
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

const chatRoomHTML = () => `
  <p>This is a chatroom</p>
  <mark id="connection-status">Connecting...</mark>
  <div id="chat-feed">
  </div>
  <form id="chat-form" action="/submit" method="post">
    <label for="message-input">Message</label>
    <input id="message-input" name="message" required>
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

const topic = "my-topic";

const sessions = new Map<string, string>()
const port = 8080

type ServerData = { username: string }

const sockets: ServerWebSocket<ServerData>[] = []

Bun.serve<ServerData>({
  port,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/subscribe") {
      const sessionId = generateUUID()
      const username = generateUsername()
      sessions.set(sessionId.toString(), username)
      if (server.upgrade(req, {
        headers: {
          "Set-Cookie": `TurboDemoSessionId=${sessionId}`,
        },
        data: { username }
      })) { return }
      return new Response("Could not upgrade", { status: 500 })
    }

    if (url.pathname === "/submit") {
      if (server.upgrade(req)) { return }

      const formData = await req.formData()
      const message = formData.get("message")

      const sessionId = req.headers.get("Cookie")?.split("=")[1]
      if (!sessionId) return new Response("No session", { status: 400 })
      const username = sessions.get(sessionId)

      if (typeof message !== "string") return new Response("Invalid message", { status: 400 })
      if (message.trim() === "") return new Response("", { status: 204 })

      sockets.forEach(socket => {
        if (socket.data.username === username) {
          socket.send(streamHTML(ownMessageHTML(`You: ${message}`)))
        }
        else {
          socket.send(streamHTML(messageHTML(`${username}: ${message}`)))
        }
      })

      return new Response("", { status: 204 })
    }

    if (url.pathname === "/") return new Response(layout("Chatroom", chatRoomHTML()), {
      headers: {
        "Content-Type": "text/html",
      }
    });
    if (url.pathname === "/client.js") return new Response(Bun.file("./client.js"), { headers: { "Content-Type": "text/javascript" } });
    return new Response("404!");
  },
  websocket: {
    open(ws) {
      ws.subscribe(topic)
      sockets.push(ws)
      sockets.forEach(socket => {
        let message = ""

        if (socket.data.username === ws.data.username) {
          message = ownMessageHTML(`You joined the chat as '${ws.data.username}'`)
        } else {
          message = messageHTML(`${ws.data.username} joined the chat`)
        }

        socket.send(streamHTML(message))
      })
    },
    message(ws, message) { },
    close(ws) {
      sockets.forEach(socket => {
        if (socket.data.username === ws.data.username) {
          socket.send(streamHTML(ownMessageHTML(`You left the chat`)))
        }
        else {
          socket.send(streamHTML(messageHTML(`${ws.data.username} left the chat`)))
        }
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
