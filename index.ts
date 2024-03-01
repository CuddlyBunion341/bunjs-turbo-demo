const headers = {
  "Content-Type": "text/html",
}

Bun.serve({
  port: 8080,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response(`
      <h1>Homepage</h1>
      <p>This is a homepage</p>
    `, {headers});
    if (url.pathname === "/article1") return new Response(`
      <h1>Article1</h1>
      <p>This is the first article page</p>
    `, {headers});
    if (url.pathname === "/article2") return new Response(`
      <h1>Article2</h1>
      <p>This is the second article page</p>
    `, {headers});
    return new Response("404!");
  },
});

console.log("Bun is running on http://localhost:8080")


console.log("Bun is running on http://localhost:8080")
