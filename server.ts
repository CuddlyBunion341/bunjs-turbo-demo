const headers = {
  "Content-Type": "text/html",
}

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
`;

Bun.serve({
  port: 8080,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response(layout("Chatroom", `
    <p>This is a chatroom</p>
    <div id="chat-feed"></div>
    <form id="chat-form">
      <label for="message-input">Message</label>
      <input id="message-input">
      <input type="submit" value="Send">
    </form>`), {headers});
    if (url.pathname === "/client.js") return new Response(Bun.file("./client.js"), {headers: {"Content-Type": "text/javascript"}});
    return new Response("404!");
  },
  websocket: {
    open(ws) {
      console.log("Websocket opened")
      ws.subscribe("my-topic")
    },
    message(ws, message) {
      console.log("Websocket received message: ", message)
      ws.send("Hello from server");
    },
    close(ws) {
      console.log("Websocket closed")
    }
  }
});

console.log("Bun is running on http://localhost:8080")
