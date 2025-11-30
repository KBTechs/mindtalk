import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

type ScoreItem = {
  key: string;
  label: string;
  score: number;
};

type Message = {
  id: number;
  sender: "user" | "system";
  text: string;
};

type Situation = {
  id: string;
  label: string;
  description: string;
};

const SITUATIONS: Situation[] = [
  {
    id: "work-report",
    label: "上司への業務報告",
    description: "進捗報告や、設計の相談をするシチュエーション",
  },
  {
    id: "review-explanation",
    label: "レビューでの説明",
    description: "自分の実装内容や設計意図を説明するときのシチュエーション",
  },
  {
    id: "casual-talk",
    label: "カジュアルな雑談",
    description: "美容師・同僚などと軽く雑談するときのシチュエーション",
  },
];

// 会話ログ1件ぶんの型（追加）
type TalkMessage = {
  id: number;
  sender: "user" | "system"; // ひとまず user と system だけ
  text: string;
};

function App() {
  // 入力テキスト
  const [text, setText] = useState("");
  // バックエンドから返ってきたスコア一覧
  const [scores, setScores] = useState<ScoreItem[] | null>(null);
  // コメント
  const [comment, setComment] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 会話ログ（追加）
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [nextId, setNextId] = useState(1); // ログ用の連番ID

  const [selectedSituation, setSelectedSituation] = useState<Situation | null>(
    null
  );

  // 「送信する」押下時の処理
  const sendText = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    // まず「ユーザーの発言」をログに追加
    const userMessage: TalkMessage = {
      id: nextId,
      sender: "user",
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setNextId((id) => id + 1);

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (!res.ok) {
        throw new Error(`HTTPエラー: ${res.status}`);
      }

      const data = await res.json();

      // バックエンドからのスコア・コメントをそのまま反映
      setScores(data.scores);
      setComment(data.comment ?? "");

      // 解析結果もログとして追加（簡易版の文言でOK）
      const systemMessage: TalkMessage = {
        id: nextId + 1,
        sender: "system",
        text: data.comment ?? "解析コメント（仮）",
      };
      setMessages((prev) => [...prev, systemMessage]);
      setNextId((id) => id + 2);
    } catch (e: any) {
      console.error(e);
      setError("通信に失敗しました");
      setScores(null);
      setComment("");
    } finally {
      setLoading(false);
      // 毎回入力欄をクリアしたいならここで空文字をセット
      // setText("");
    }
  };
  // シチュエーションがまだ選ばれていない場合は「シチュ選択画面」だけを表示
  if (!selectedSituation) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f5f6fa",
          padding: "40px 60px",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            fontWeight: 800,
            marginBottom: "32px",
            color: "#1f2933",
          }}
        >
          MindTalk
        </h1>

        <p style={{ fontSize: "16px", color: "#475569", marginBottom: "24px" }}>
          まずは練習したいシチュエーションを選んでください。
        </p>

        <div
          style={{
            display: "flex",
            gap: "24px",
            flexWrap: "wrap",
            maxWidth: "900px",
          }}
        >
          {SITUATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSituation(s)}
              style={{
                flex: "1 1 260px",
                textAlign: "left",
                padding: "16px 20px",
                borderRadius: "16px",
                border: "1px solid #d1d9e6",
                backgroundColor: "white",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  marginBottom: "6px",
                  color: "#111827",
                }}
              >
                {s.label}
              </div>
              <div style={{ fontSize: "14px", color: "#6b7280" }}>
                {s.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f6fa",
        padding: "40px 0",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 40px",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: 800,
            marginBottom: "16px",
            color: "#1f2933",
          }}
        >
          MindTalk Frontend
        </h1>

        <div
          style={{
            marginBottom: "32px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "14px", color: "#6b7280" }}>
            シチュエーション:
          </span>
          <span style={{ fontSize: "16px", fontWeight: 600 }}>
            {selectedSituation?.label}
          </span>

          <button
            onClick={() => {
              // シチュ選び直し。会話や結果も一旦リセットしておく
              setSelectedSituation(null);
              setText("");
              setScores(null);
              setComment("");
              setMessages([]);
              setError(null);
            }}
            style={{
              marginLeft: "auto",
              fontSize: "12px",
              borderRadius: "999px",
              border: "none",
              padding: "4px 12px",
              backgroundColor: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            シチュを選び直す
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: "40px",
          }}
        >
          {/* 左側：入力エリア */}
          <div style={{ flex: 1.2 }}>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#1f2933",
              }}
            >
              会話入力:
            </p>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="話した内容、もしくは想定のセリフをここに入力..."
              style={{
                width: "100%",
                resize: "vertical",
                padding: "12px",
                borderRadius: "12px",
                border: "1px solid #cbd2e1",
                fontSize: "14px",
                lineHeight: 1.6,
                boxSizing: "border-box",
                backgroundColor: "white",
              }}
            />

            <div style={{ marginTop: "16px" }}>
              <button
                onClick={sendText}
                disabled={loading || !text.trim()}
                style={{
                  padding: "8px 22px",
                  borderRadius: "999px",
                  border: "none",
                  backgroundColor:
                    loading || !text.trim() ? "#9bb4ff" : "#2962ff",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: loading || !text.trim() ? "not-allowed" : "pointer",
                  boxShadow: "0 6px 16px rgba(41,98,255,0.25)",
                  transition: "transform 0.1s ease, boxShadow 0.1s ease",
                }}
              >
                {loading ? "解析中..." : "送信する"}
              </button>
            </div>

            {/* 会話ログ */}
            <div
              style={{
                marginTop: "24px",
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                会話ログ
              </p>
              {messages.length === 0 && (
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  まだ会話はありません。入力して「送信する」を押すとここに履歴が残ります。
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    marginBottom: "8px",
                    textAlign: m.sender === "user" ? "right" : "left",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: "12px",
                      backgroundColor:
                        m.sender === "user" ? "#dbeafe" : "#e5e7eb",
                      fontSize: "12px",
                    }}
                  >
                    {m.sender === "user" ? "あなた: " : "システム: "}
                    {m.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：レーダーチャート＋コメント */}
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "8px",
                color: "#1f2933",
              }}
            >
              分析結果:
            </p>

            {!scores && !error && (
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                テキストを入力して「送信する」を押すと、ここにレーダーチャートと
                コメントが表示されます。
              </p>
            )}

            {error && (
              <p style={{ color: "#e53935", fontSize: "13px" }}>{error}</p>
            )}

            {scores && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: "20px",
                  boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
                }}
              >
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <RadarChart data={scores}>
                      <PolarGrid stroke="#e5e9f0" />
                      <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 5]}
                        tick={{ fontSize: 11 }}
                        tickCount={6}
                      />
                      <Radar
                        name="スコア"
                        dataKey="score"
                        stroke="#2962ff"
                        fill="#2962ff"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      marginBottom: "4px",
                    }}
                  >
                    コメント:
                  </p>
                  <p style={{ fontSize: "13px", color: "#374151" }}>
                    {comment || "コメントはまだありません。"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
