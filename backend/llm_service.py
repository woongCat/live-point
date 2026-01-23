import logging
import os

from openai import APIConnectionError, APITimeoutError, OpenAI

logger = logging.getLogger(__name__)

BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:1234/v1")
MODEL_NAME = os.getenv("LLM_MODEL", "qwen/qwen3-vl-4b")
REQUEST_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "12.0"))
ERROR_MESSAGE = "LLM 서버에 연결할 수 없습니다."

logger.info(f"LLM Service initialized: base_url={BASE_URL}, model={MODEL_NAME}")

client = OpenAI(
    base_url=BASE_URL,
    api_key="lmstudio",
    timeout=REQUEST_TIMEOUT,
)

SYSTEM_PROMPT = """너는 요지 추출기야. 사용자의 발화에서 핵심 의도와 행동 의미만 남겨.
한국어로 1~2문장만 출력해. 필러/반복/군더더기 제거.
설명 추가 없이 요지만 작성해."""


async def extract_point(transcript: str) -> str:
    """전사 텍스트에서 요지 추출 (스트리밍)"""
    if not transcript.strip():
        return ""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
            max_tokens=150,
            temperature=0.3,
        )
    except APIConnectionError as e:
        logger.error(f"LLM 연결 실패: {e}")
        return ERROR_MESSAGE
    except APITimeoutError as e:
        logger.error(f"LLM 요청 타임아웃: {e}")
        return ERROR_MESSAGE
    except Exception as e:
        logger.error(f"LLM 요청 중 예외 발생: {e}")
        return ERROR_MESSAGE

    content = response.choices[0].message.content
    return content.strip() if content else ""


async def extract_point_stream(transcript: str):
    """전사 텍스트에서 요지 추출 (스트리밍 제너레이터)"""
    if not transcript.strip():
        return

    try:
        stream = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
            max_tokens=150,
            temperature=0.3,
            stream=True,
        )
    except APIConnectionError as e:
        logger.error(f"LLM 스트리밍 연결 실패: {e}")
        yield ERROR_MESSAGE
        return
    except APITimeoutError as e:
        logger.error(f"LLM 스트리밍 타임아웃: {e}")
        yield ERROR_MESSAGE
        return
    except Exception as e:
        logger.error(f"LLM 스트리밍 요청 중 예외 발생: {e}")
        yield ERROR_MESSAGE
        return

    for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield content
