const headers = {
  "Content-Type": "text/html",
}

const layout = (title: string, content: string) => `
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.simplecss.org/simple.min.css">
      <script src="./client.js"></script>
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
    console.log(url.pathname)
    if (url.pathname === "/") return new Response(layout("Homepage", "<p>This is a homepage</p>"), {headers});
    if (url.pathname === "/article1") return new Response(layout("Article1", "<p>This is the first article page</p>"), {headers});
    if (url.pathname === "/article2") return new Response(layout("Article2", "<p>This is the second article page</p>"), {headers});
    if (url.pathname === "/client.js") return new Response(Bun.file("./client.js"), {headers: {"Content-Type": "text/javascript"}});
    return new Response("404!");
  },
});

console.log("Bun is running on http://localhost:8080")
