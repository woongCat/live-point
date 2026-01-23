import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """너는 요지 추출기야. 사용자가 말한 내용에서 핵심 의도만 추출해.
- 필러(음, 그러니까, 뭐랄까, 어)와 반복 제거
- 진짜 하고 싶은 말을 1-2문장으로
- 한국어로 응답
- 요지만 출력, 다른 설명 없이"""

async def extract_point(transcript: str) -> str:
    """전사 텍스트에서 요지 추출 (스트리밍)"""
    if not transcript.strip():
        return ""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript}
        ],
        max_tokens=150,
        temperature=0.3,
    )

    return response.choices[0].message.content.strip()

async def extract_point_stream(transcript: str):
    """전사 텍스트에서 요지 추출 (스트리밍 제너레이터)"""
    if not transcript.strip():
        return

    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": transcript}
        ],
        max_tokens=150,
        temperature=0.3,
        stream=True,
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
