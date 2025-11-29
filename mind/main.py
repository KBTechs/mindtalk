from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConversationRequest(BaseModel):
    text: str


class ConversationResponse(BaseModel):
    original: str
    scores: dict
    summary: str
    comments: list[str]

class TalkInput(BaseModel):
    text: str

@app.post("/analyze")
def analyze_talk(input: TalkInput):
    return {
    "scores": [
        {"key": "pace",          "label": "話す速さ",       "score": 3},
        {"key": "assertiveness", "label": "主張のはっきりさ", "score": 4},
        {"key": "empathy",       "label": "相手への配慮",     "score": 2},
        {"key": "logic",         "label": "筋の通り方",       "score": 3},
        {"key": "confidence",    "label": "自信の出し方",     "score": 4},
        {"key": "etc",           "label": "その他",           "score": 3},
    ],
    "comment": "仮コメント ..."
}

@app.get("/")
def read_root():
    return {"status": "ok", "message": "mindtalk backend is running"}


@app.post("/conversation", response_model=ConversationResponse)
def analyze_conversation(req: ConversationRequest):
    analysis = simple_analysis(req.text)
    return analysis


def simple_analysis(text: str) -> dict:
    """
    いまは完全に人力ロジック。
    単語の出現回数から、ざっくりスコアとコメントを作る。
    あとでここをLLM呼び出しに差し替えやすいように、一か所に集約してある。
    """

    lowered = text  # 日本語なのでとりあえずそのまま

    # 自己否定ワードとポジティブワード
    self_down_words = ["ダメ", "無理", "しょぼい", "できない", "自信ない", "恥ずかしい"]
    self_up_words = ["いける", "できる", "大丈夫", "自信ある", "やれる"]

    # 目的っぽいワード
    purpose_words = ["目的", "ゴール", "狙い", "ために", "まず", "優先", "やりたい"]

    # 推測・ふわっとしたワード
    guessing_words = ["たぶん", "多分", "気がする", "かも", "かな", "なんとなく"]

    # 感情ワード
    emotion_words = ["不安", "怖い", "つらい", "辛い", "イライラ", "嬉しい", "楽しい", "しんどい"]

    # 他人基準ワード
    other_words = ["どう思われる", "思われそう", "評価され", "バカにされ", "嫌われ", "怒られ"]

    # 行動ワード
    action_words = ["やる", "やってみる", "試す", "進める", "書く", "作る", "話す", "聞く"]

    def count_list(words):
        return sum(lowered.count(w) for w in words)

    self_down = count_list(self_down_words)
    self_up = count_list(self_up_words)
    purpose = count_list(purpose_words)
    guessing = count_list(guessing_words)
    emotion = count_list(emotion_words)
    other = count_list(other_words)
    action = count_list(action_words)

    # スコア計算（ざっくり。高いほどその傾向が強い）
    def clamp(x):
        return max(0, min(100, x))

    self_doubt_score = clamp(40 + (self_down - self_up) * 15)
    purpose_focus_score = clamp(30 + purpose * 15)
    certainty_score = clamp(70 - guessing * 10)  # 推測が多いと下がる
    emotion_focus_score = clamp(20 + emotion * 10)
    other_focus_score = clamp(20 + other * 15)
    action_focus_score = clamp(30 + action * 10)

    scores = {
        "self_doubt": self_doubt_score,
        "purpose_focus": purpose_focus_score,
        "certainty": certainty_score,
        "emotion_focus": emotion_focus_score,
        "other_focus": other_focus_score,
        "action_focus": action_focus_score,
    }

    # コメント生成
    comments: list[str] = []

    if self_doubt_score >= 60:
        comments.append("自分を下げる表現がやや多めです。事実だけを説明する言い方に少し寄せるとバランスが良くなります。")
    elif self_doubt_score <= 30:
        comments.append("自己否定は少なめです。この調子で、事実ベースで話せていると言えます。")

    if purpose_focus_score >= 60:
        comments.append("話の中に『何のための話か』が比較的見えています。もう一歩だけ結論やゴールを先に一言で言えると、さらに分かりやすくなります。")
    else:
        comments.append("目的やゴールに触れる言葉が少なめです。『結局、何を決めたい話か』を最初に一言添えると会話が安定します。")

    if certainty_score <= 40:
        comments.append("『たぶん』『気がする』などの表現が多めです。事実と推測を分けて話すと、信頼感が上がりやすくなります。")

    if emotion_focus_score >= 60:
        comments.append("感情のことばが多めです。感情を伝えるのは良いことですが、『それで具体的にどうしたいか』も一緒に添えると相手が動きやすくなります。")

    if other_focus_score >= 60:
        comments.append("『どう思われるか』への意識が強めです。相手の評価よりも、まず自分が本当に望んでいることを一段目に置いてみると楽になります。")

    if action_focus_score >= 60:
        comments.append("行動につながる表現が出ています。小さくても具体的な一歩を口に出せているのは良い傾向です。")
    elif action_focus_score <= 30:
        comments.append("行動につながる表現がやや少なめです。最後に『なので今日はここまでやる』と一行だけ決めてみると、会話が締まりやすくなります。")

    if not comments:
        comments.append("大きな偏りは見られません。事実と感情、目的と行動のバランスは比較的取れています。")

    # 上のコメント群からざっくり要約を一行作る
    summary_parts = []
    if self_doubt_score >= 60:
        summary_parts.append("自己評価を下げる癖が少し強め")
    if purpose_focus_score < 50:
        summary_parts.append("目的やゴールが後ろに回りがち")
    if other_focus_score >= 60:
        summary_parts.append("他人の評価を気にしやすい")
    if action_focus_score >= 60:
        summary_parts.append("行動にはつなげられている")

    if summary_parts:
        summary = " / ".join(summary_parts)
    else:
        summary = "大きな偏りはなく、バランスはおおむね良好です。"

    return {
        "original": text,
        "scores": scores,
        "summary": summary,
        "comments": comments,
    }