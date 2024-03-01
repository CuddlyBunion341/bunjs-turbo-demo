console.log("Client is running!")

const client = new WebSocket("ws://localhost:8080")
const form = document.getElementById("chat-form")
const chatFeed = document.getElementById("chat-feed")
const connectionStatus = document.getElementById("connection-status")

client.addEventListener("message", (event) => {
  chatFeed.innerHTML += event.data
})

client.addEventListener("open", (event) => {
  connectionStatus.innerText = "Connected to Chat Server"
})

client.addEventListener("close", (event) => {
  connectionStatus.innerText = "Disconnected from Chat Server"
})

form.addEventListener("submit", (event) => {
  event.preventDefault()
  const formData = new FormData(form)
  const message = formData.get("message")
  client.send(message)
  form.reset()
})
