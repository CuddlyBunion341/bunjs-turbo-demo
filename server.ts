const layout = (title: string, content: string) => `
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
      <script src="./client.js" defer></script>
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

const chatRoomHTML = () => `
  <p>This is a chatroom</p>
  <mark id="connection-status"></mark>
  <div id="chat-feed"></div>
  <form id="chat-form">
    <label for="message-input">Message</label>
    <input id="message-input" name="message">
    <input type="submit" value="Send">
  </form>
`

const topic = "my-topic";

Bun.serve({
  port: 8080,
  fetch(req, server) {
    if (server.upgrade(req)) { return }

    const url = new URL(req.url);
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
      ws.publishText(topic, messageHTML("Someone joined the chat"))
    },
    message(ws, message) {
      console.log("Websocket received: ", message)
      ws.publishText(topic, messageHTML(`Anonymous: ${message}`))
    },
    close(ws) {
      console.log("Websocket closed")
      ws.publishText(topic, messageHTML("Someone left the chat"))
    },
    publishToSelf: true
  }
});

console.log("Bun is running on http://localhost:8080")
