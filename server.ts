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
    ${message}
  </p>
`

const messageStream = (message: string) => `
  <turbo-stream action="append" target="chat-feed">
    <template>
      ${messageHTML(message)}
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

const topic = "my-topic";

const sessions = new Map<string, string>()
const port = 8080

type ServerData = {
  username: string
}

const sockets: ServerWebSocket<ServerData>[] = []

Bun.serve<ServerData>({
  port,
  async fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/subscribe") {
      console.log("Subscribing to topic")
      const sessionId = Math.random()
      sessions.set(sessionId.toString(), `Anonymous`)
      if (server.upgrade(req, {
        headers: {
          "Set-Cookie": `TurboDemoSessionId=${sessionId}`,
        },
        data: {
          username: sessionId,
        }
      })) { return }
      console.log("Could not upgrade")
      return new Response("Could not upgrade", { status: 500 })
    }

    if (url.pathname === "/submit") {
      console.log(sockets)
      if (server.upgrade(req)) { return }
      console.log("Upgrade failed")

      const formData = await req.formData()
      const message = formData.get("message")

      const sessionId = req.headers.get("Cookie")?.split("=")[1]
      if (!sessionId) return new Response("No session", { status: 400 })
      const username = sessions.get(sessionId)

      if (typeof message !== "string") return new Response("Invalid message", { status: 400 })
      if (message.trim() === "") return new Response("", { status: 204 })

      if (server.upgrade(req, {
        headers: {
          "Set-Cookie": `TurboDemoSessionId=${sessionId}`,
        },
        data: {
          username: sessionId,
        }
      })) { return }

      const chatMessage = `${username}: ${message}`
      server.publish(topic, messageStream(chatMessage))

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
      console.log("Websocket opened")
      ws.subscribe(topic)
      sockets.push(ws)
      sockets.forEach(socket => {
        socket.send(messageStream(`${ws.data.username} joined the chat`))
      })
    },
    message(ws, message) {
      console.log(ws)
      console.log("Websocket received: ", message)
      if (typeof message == "string" && message.trim() === "") return
      ws.send(messageStream(`SOME MESSAGE: ${message}`))
    },
    close(ws) {
      console.log("Websocket closed")
      ws.unsubscribe(topic)
      sockets.forEach(socket => {
        socket.send(messageStream(`${ws.data.username} left the chat`))
      })
      const socketIndex = sockets.indexOf(ws)
      if (socketIndex > -1) {
        sockets.splice(socketIndex, 1)
      }
    },
    publishToSelf: true
  }
});

console.log(`Bun is running on http://localhost:${port}`)
