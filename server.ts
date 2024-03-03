import type { Server, ServerWebSocket } from "bun";

const layout = (title: string, content: string, options: {clientId: string, username: string}) => `
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
      <script type="module">
        import hotwiredTurbo from 'https://cdn.jsdelivr.net/npm/@hotwired/turbo@8.0.3/+esm'
      </script>
      <script src="./client.js" type="module" defer></script>
      <style>
        body {
          align-content: center;
          top: 0;
          position: absolute;
          width: 100%;
        }
      </style>
    </head>
    <body>
      <header>
        <h1>Turbo Streams</h1>
        <p>Bring your application to live with turbo streams!</p>
      </header>
      <main>
        ${content}
      </main>
      <footer>
        <p>
          Provided to you by <a href="https://github.com/CuddlyBunion341">CuddlyBunion341</a> @ <a href="https://www.renuo.ch/">Renuo AG</a>
        </p>
      </footer>
      <turbo-stream-source src="ws://localhost:${port}/subscribe?clientId=${options.clientId}&username=${options.username}" />
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

const userHTML = (username: string) => `
  <li id="user-${username}">${username}</li>
`

const chatRoomHTML = (clientId: string) => `
  <h2>Chatroom Demo</h2>
  <p>This is a simple ChatRoom built using turbo streams and stimulus.</p>
  <hr>
  <strong>Users in Chat:</strong>
  <ul id="user-list">
    ${Object.values(users).map(userHTML).join("")}
  </ul>
  <hr>
  <div id="chat-feed">
  </div>
  <form id="chat-form" action="/submit" method="post" data-controller="form" data-action="turbo:submit-end->form#clear">
    <label for="message-input">Message:</label>
    <input name="message" data-form-target="input" required >
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


const handleSubscription = (req: Request, server: Server) => {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")
  if (!clientId) return new Response("Invalid clientId", { status: 400 })

  let username = url.searchParams.get("username")
  if (!username) username = generateUniqueUsername(users)

  users[clientId] = username

  if (server.upgrade(req, { data: { username, clientId: clientId } })) { return }
  return new Response("Could not upgrade", { status: 500 })
}

const handleSubmission = async (req: Request, server: Server) => {
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

const handleRoot = () => {
  const clientId = generateUUID()
  const username = generateUniqueUsername(users)
  return new Response(layout("ChatRoom", chatRoomHTML(clientId), {clientId, username}), { headers: { "Content-Type": "text/html" }})
}

const topic = "my-topic";

type ClientId = string
type Username = string

const users: Record<ClientId, Username> = {}
const port = 8080

type ServerData = { username: string, clientId: string }

const sockets: ServerWebSocket<ServerData>[] = []

Bun.serve<ServerData>({
  port,
  async fetch(req, server) {
    const url = new URL(req.url);

    switch(url.pathname) {
      case "/subscribe":
        return handleSubscription(req, server)
      case "/submit":
        return handleSubmission(req, server)
      case "/":
        return handleRoot()
      case "/client.js":
        return new Response(Bun.file("./client.js"), { headers: { "Content-Type": "text/javascript" } });
      default:
        return new Response("404 Not Found", { status: 404 });
    }
  },
  websocket: {
    open(ws) {
      ws.subscribe(topic);
      sockets.push(ws);
      sockets.forEach(socket => {
        const isOwnSocket = socket.data.username === ws.data.username;
        socket.send(streamMessage(`${ws.data.username} joined the chat`, isOwnSocket));
        socket.send(streamHTML(userHTML(socket.data.username), { action: "append", target: "user-list" }));
      });
    },
    message(ws, message) { },
    close(ws) {
      sockets.forEach(socket => {
        const isOwnSocket = socket.data.username === ws.data.username;
        socket.send(streamHTML(``, { action: "remove", target: `user-${ws.data.username}` }));
        socket.send(streamMessage(`${ws.data.username} left the chat`, isOwnSocket));
      });
      delete users[ws.data.clientId];
      ws.unsubscribe(topic);
      const socketIndex = sockets.indexOf(ws);
      if (socketIndex > -1) {
        sockets.splice(socketIndex, 1);
      }
    },
    publishToSelf: true
  }
});

console.log(`Bun is running on http://localhost:${port}`)
