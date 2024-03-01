const messages: string[] = []

const layout = (title: string, content: string) => `
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
      <script src="./client.js" defer></script>
      <script type="module">
        import hotwiredTurbo from 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.3/+esm'
      </script>
      <turbo-stream-source src="http://localhost:8080/subscribe" />
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        ${content}
      </div>
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
    ${messages.map(messageHTML).join("")}
  </div>
  <form id="chat-form" action="/submit" method="post">
    <label for="message-input">Message</label>
    <input id="message-input" name="message" required>
    <input type="submit" value="Send">
  </form>
`

const topic = "my-topic";

Bun.serve({
  port: 8080,
  async fetch(req, server) {
    const url = new URL(req.url);

   if (url.pathname === "/subscribe") {
      if (server.upgrade(req)) { return }
      console.log("Could not upgrade")
      return new Response("Could not upgrade", { status: 500 })
    }

    if (url.pathname === "/submit") {
      const formData = await req.formData()
      const message = formData.get("message")

      if (typeof message !== "string") return new Response("Invalid message", { status: 400 })
      if (message.trim() === "") return new Response("", { status: 204 })

      const chatMessage = `Anonymous: ${message}`
      messages.push(chatMessage)

      server.publish(topic, messageStream(chatMessage))

      return new Response(messageStream(chatMessage), { headers: { "Content-Type": "text/vnd.turbo-stream.html", } });
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
      ws.publishText(topic, messageStream("Someone joined the chat"))
    },
    message(ws, message) {
      console.log("Websocket received: ", message)
      if (typeof message == "string" && message.trim() === "") return
      ws.publishText(topic, messageStream(`SOME MESSAGE: ${message}`))
    },
    close(ws) {
      console.log("Websocket closed")
      ws.publishText(topic, messageStream("Someone left the chat"))
    },
    publishToSelf: true
  }
});

console.log("Bun is running on http://localhost:8080")
