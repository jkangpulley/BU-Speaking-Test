# 영어 스피킹 배치고사 시스템
**English Speaking Placement Test — Baekseok University**

185명(러시아/카자흐스탄/우즈베키스탄 초중고생) 대상 온라인 영어 말하기 배치고사

---

## 시스템 구성

| 구성요소 | 역할 |
|----------|------|
| **FastAPI** (Python) | REST API 백엔드 |
| **React + Vite** | 학생·관리자 프론트엔드 |
| **SQLite** | 데이터베이스 (185명 규모에 충분) |
| **Claude API** | 음성 응답 자동 채점 엔진 |
| **MediaRecorder API** | 브라우저 음성 녹음 |
| **Web Speech API** | 실시간 텍스트 변환 (Chrome/Edge) |

---

## 채점 기준 (0–4점 × 5항목 = 20점/문항 × 5문항 = 100점 만점)

| 항목 | 설명 |
|------|------|
| 과제 완성도 (Task Completion) | 질문을 이해하고 충실히 답했는가 |
| 유창성 (Fluency) | 자연스럽고 막힘 없이 말하는가 |
| 어휘력 (Vocabulary) | 다양하고 적절한 단어를 사용하는가 |
| 문법 (Grammar) | 문법적으로 정확한 구조를 사용하는가 |
| 의사소통 (Communication) | 의미 전달이 효과적으로 이루어지는가 |

### CEFR 레벨 → 반 배정

| 점수 | 레벨 |
|------|------|
| 0–19  | A1 (입문) |
| 20–39 | A2 (초급) |
| 40–59 | B1 (중급) |
| 60–79 | B2 (중상급) |
| 80–100 | C1 (고급) |

---

## 설치 및 실행

### 1. 사전 준비
- Python 3.11+
- Node.js 18+
- Anthropic API 키

### 2. 백엔드 설정

```bash
cd speaking-test/backend

# 가상환경 생성 및 활성화
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# 패키지 설치
pip install -r requirements.txt

# 환경변수 설정
copy .env.example .env
# .env 파일을 열고 ANTHROPIC_API_KEY 입력

# 초기 데이터 생성 (최초 1회)
python seed.py

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

### 3. 프론트엔드 설정

```bash
cd speaking-test/frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

### 4. 접속

| URL | 역할 |
|-----|------|
| http://localhost:5173 | 학생/관리자 접속 |
| http://localhost:8000/docs | API 문서 (Swagger) |

**기본 관리자 계정**
- 아이디: `admin`
- 비밀번호: `admin1234`

---

## 관리자 워크플로우

1. **학생 등록**: `/admin/students` → 일괄 등록 (JSON)
2. **시험 모니터링**: 대시보드에서 실시간 현황 확인
3. **자동 채점**: 대시보드 → "AI 자동 채점" 버튼
4. **반 배정**: `/admin/placement` → "반 배정 실행" 버튼
5. **결과 확인**: 각 학생 상세 화면에서 음성 청취 + 세부 점수 확인

---

## 학생 일괄 등록 JSON 형식

```json
[
  {
    "username": "s001",
    "password": "pass1234",
    "name": "Ivan Petrov",
    "country": "Russia",
    "age_group": "high",
    "grade": "10"
  },
  {
    "username": "s002",
    "password": "pass1234",
    "name": "Aizat Bekova",
    "country": "Kazakhstan",
    "age_group": "middle",
    "grade": "8"
  }
]
```

`country`: `Russia` / `Kazakhstan` / `Uzbekistan`  
`age_group`: `elementary` / `middle` / `high`

---

## 시험 문항 (5문항, 난이도 순)

| 문항 | 준비 | 최대 | 난이도 | 내용 |
|------|------|------|--------|------|
| Q1 | 15초 | 60초 | ★ | 자기소개 |
| Q2 | 15초 | 60초 | ★★ | 학교·과목 설명 |
| Q3 | 20초 | 60초 | ★★★ | 중요한 사람 묘사 |
| Q4 | 20초 | 60초 | ★★★★ | 사회 문제 의견 |
| Q5 | 20초 | 60초 | ★★★★★ | 가상 여행 계획 |

---

## 브라우저 요구사항

- **Chrome 또는 Edge 권장** (Web Speech API 지원)
- Firefox: 음성 녹음은 가능, 실시간 텍스트 변환 미지원 (채점은 오디오 파일 기반으로 가능)
- HTTPS 환경 필요 (배포 시)
