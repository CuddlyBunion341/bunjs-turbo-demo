console.log("Client is running!")

const client = new WebSocket("ws://localhost:8080")
const form = document.getElementById("chat-form")
const chatFeed = document.getElementById("chat-feed")

client.onmessage = (message) => {
  chatFeed.innerHTML += `<div>${message.data}</div>`
}

form.addEventListener("submit", (event) => {
  event.preventDefault()
  const formData = new FormData(form)
  const message = formData.get("message")
  client.send(message)
  form.reset()
})
