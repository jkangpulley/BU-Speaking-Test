"""
Claude-based English speaking scorer for young learners (ages 8-18).
Rubric based on CEFR and Korean 초·중등 영어 말하기 평가 기준.
Each criterion: 0–4. Total per question: 0–20. Five questions: 0–100.
"""

import json
import os
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are an expert English language teacher specializing in assessing young learners (ages 8–18) who come from Russia, Kazakhstan, or Uzbekistan. Your assessments are fair, encouraging, and calibrated for non-native speakers at school level.

You will receive:
- The question the student was asked
- The student's spoken response (transcribed)
- The duration of their response in seconds

Evaluate strictly on these 5 criteria (0–4 each):

1. **Task Completion** – Did the student understand and address the question?
   0=No attempt / off-topic | 1=Minimal, very incomplete | 2=Partially addressed | 3=Mostly complete | 4=Fully and clearly answered

2. **Fluency** – How naturally and smoothly did the student speak? (consider pauses, fillers, self-corrections appropriate to age/level)
   0=Cannot produce connected speech | 1=Very halting, hard to follow | 2=Some hesitation, generally understandable | 3=Mostly smooth, minor hesitations | 4=Natural, confident speech rhythm

3. **Vocabulary** – Range and appropriateness of words. Consider age-appropriate expectations.
   0=No vocabulary beyond single words | 1=Very limited, survival vocabulary only | 2=Basic vocabulary with some variety | 3=Good range appropriate for topic | 4=Rich, varied, precise word choices

4. **Grammar** – Accuracy of grammatical structures.
   0=No recognisable structures | 1=Mostly errors, hard to parse | 2=Basic structures with frequent errors | 3=Generally accurate, some errors | 4=Accurate, varied grammatical structures

5. **Communication** – Overall ability to convey meaning, even with limited English.
   0=Cannot convey meaning | 1=Communication severely impeded | 2=Basic communication achieved | 3=Communicates effectively with minor breakdowns | 4=Communicates clearly and confidently

Also provide an overall CEFR level estimate for this single response: A1 / A2 / B1 / B2 / C1.

Respond ONLY with valid JSON, no other text:
{
  "task_completion": <integer 0-4>,
  "fluency": <integer 0-4>,
  "vocabulary": <integer 0-4>,
  "grammar": <integer 0-4>,
  "communication": <integer 0-4>,
  "cefr": "<A1|A2|B1|B2|C1>",
  "feedback": "<1-2 sentences of encouraging, constructive feedback in English>"
}"""


def score_response(question: str, transcript: str, duration: float) -> dict:
    """Score one spoken response. Returns dict with scores and feedback."""

    # No transcript detected
    if not transcript or len(transcript.strip()) < 5:
        return {
            "task_completion": 0,
            "fluency": 0,
            "vocabulary": 0,
            "grammar": 0,
            "communication": 0,
            "cefr": "A1",
            "feedback": "No speech was detected for this response. Please try again.",
        }

    user_message = f"""Question: {question}

Student's transcript: {transcript}

Speaking duration: {duration:.1f} seconds"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    text = response.content[0].text.strip()

    # Extract JSON even if there is surrounding text
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        text = text[start:end]

    data = json.loads(text)

    # Clamp values to 0-4
    for key in ("task_completion", "fluency", "vocabulary", "grammar", "communication"):
        data[key] = max(0, min(4, int(data.get(key, 0))))

    return data


def compute_overall_level(responses: list) -> tuple[float, str]:
    """
    Given a list of Response ORM objects (already scored),
    return (total_score_0_to_100, cefr_level).
    Weights increase with question difficulty (later questions weighted more).
    """
    weights = [1.0, 1.2, 1.4, 1.6, 1.8]   # Q1–Q5
    total_weighted = 0.0
    total_weight = 0.0

    for i, r in enumerate(responses):
        if r.total_score is not None:
            w = weights[i] if i < len(weights) else 1.0
            total_weighted += r.total_score * w
            total_weight += w

    if total_weight == 0:
        return 0.0, "A1"

    # Raw weighted average on 0–20 scale
    avg_20 = total_weighted / total_weight
    # Convert to 0–100
    score_100 = avg_20 * 5.0

    if score_100 < 20:
        level = "A1"
    elif score_100 < 40:
        level = "A2"
    elif score_100 < 60:
        level = "B1"
    elif score_100 < 80:
        level = "B2"
    else:
        level = "C1"

    return round(score_100, 1), level
