fetch("http://localhost:3000/api/code-commenter", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filePath: "test.py", fileContent: "print('hello')", prompt: "Add comments" })
}).then(res => {
  console.log("Status:", res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  function read() {
    reader.read().then(({ done, value }) => {
      if(done){ console.log("Done"); return; }
      console.log("Chunk:", decoder.decode(value));
      read();
    })
  }
  read();
}).catch(console.error);
