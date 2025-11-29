import { useState } from "react";

function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");

  const sendText = async () => {
    const res = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setResult(JSON.stringify(data.scores) + "\nコメント: " + data.comment);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>MindTalk Frontend</h1>

      <p>会話入力:</p>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ width: "400px" }}
      />

      <br />
      <br />

      <button onClick={sendText}>送信する</button>

      <br />
      <br />

      <div>
        <p>分析結果:</p>
        <pre>{result}</pre>
      </div>
    </div>
  );
}

export default App;
