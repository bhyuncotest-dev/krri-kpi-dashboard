# 🚆 KRRI (한국철도기술연구원) 보직자용 직원 KPI 관리 대시보드

![KRRI KPI Dashboard](https://img.shields.io/badge/KRRI-KPI%20Dashboard-0084FF?style=for-the-badge&logo=flask)
![Vercel Live](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)
![Python Version](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)

한국철도기술연구원(KRRI) 보직자(부서장, 연구본부장, 연구실장 등)가 소속 연구원 및 직원의 정량적/정성적 성과 지표(KPI)를 실시간으로 모니터링하고 평가, 코칭할 수 있는 **Flask 기반 대시보드 웹 애플리케이션**입니다.

🌐 **실시보드 라이브 URL**: [https://krri-kpi-dashboard-three.vercel.app](https://krri-kpi-dashboard-three.vercel.app)

🔑 **보직자 관리자 로그인 계정**:
- **아이디 (ID)**: `KRRI_LEADER`
- **비밀번호 (PW)**: `KRRI_LEADER`

---

## 🌟 주요 기능 (Key Features)

1. **보직자 전용 메인 대시보드 (`/`)**
   - 5대 핵심 정량 지표 실시간 종합 모니터링
   - Chart.js 기반 연구본부별 평균 KPI 달성률 바/라인 차트 및 가중치 도넛 차트
   - 1분기 우수 성과 연구원 Top 5 및 지연/관심 대상 연구원 자동 알림

2. **직원별 KPI 상세 관리 및 보직자 평가 (`/employees`)**
   - 본부별 필터링 및 연구원 성명/사번/직급 실시간 검색
   - 1:1 보직자 평가 모달 (지표별 실적 입력, 보직자 평가점수 수정, 멘토링 피드백 작성)
   - 신규 연구원 등록 및 기본 KPI 자동 매핑

3. **R&D 연구과제 KPI 모니터링 (`/projects`)**
   - 차세대 고속열차, KTCS-3, 하이퍼튜브 등 대형 R&D 철도 과제별 예산 집행률 및 공정 진척도 관리

4. **보직자 보고서 뷰 (`/reports`)**
   - 종합 성과 총평, 부서별 실적 등급표, 5대 KPI 항목별 결산 보고서
   - 웹 브라우저 인쇄 및 PDF 저장 레이아웃 지원

---

## 🏛️ KRRI 특화 5대 정량 KPI 지표 (Categories)

| KPI 항목 | 가중치 | 측정 단위 | 설명 |
| :--- | :---: | :---: | :--- |
| **SCI/KCI 논문 게재** | 25% | 건 | 국내외 등재 학술지 논문 게재 실적 |
| **국내외 특허 출원 및 등록** | 20% | 건 | 철도기술 핵심 특허 출원/등록 실적 |
| **기술이전 계약 실적** | 25% | 백만원 | 산업체 기술이전 및 징수 기술료 |
| **R&D 정부/민간 과제 수주** | 20% | 백만원 | 연구과제 수주 및 집행 예산 |
| **철도 현장 실증 및 시험** | 10% | 건 | 오송 시험선 및 현장 시운전 실증 |

---

## 📁 프로젝트 구조 (Directory Structure)

```text
직원관리용KPI대시보드/
├── app.py              # Flask 웹 애플리케이션 메인 라우트 및 API
├── database.py         # SQLite3 DB 초기화 및 KRRI 시드 데이터 생성
├── run.py              # 애플리케이션 실행 스크립트
├── requirements.txt    # 파이썬 의존 패키지 목록
├── .gitignore          # Git 제외 대상 설정
├── templates/          # HTML 템플릿 파일
│   ├── base.html       # 공통 레이아웃 (사이드바, 헤더, 모달)
│   ├── index.html      # 보직자 메인 대시보드
│   ├── employees.html  # 직원 KPI 상세 관리
│   ├── projects.html   # R&D 과제 모니터링
│   └── reports.html    # 보직자 성과 보고서
└── static/             # 정적 리소스
    ├── css/
    │   └── style.css   # KRRI Deep Rail Navy 테마 CSS
    └── js/
        └── main.js     # Chart.js 시각화 및 REST API 연동 JS
```

---

## 🚀 설치 및 실행 방법 (Getting Started)

### 1. 저장소 클론 (Clone Repository)
```bash
git clone https://github.com/bhyuncotest-dev/krri-kpi-dashboard.git
cd krri-kpi-dashboard
```

### 2. 가상환경 생성 및 패키지 설치 (Install Dependencies)
```bash
# 가상환경 생성 (선택 사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 필요 패키지 설치
pip install -r requirements.txt
```

### 3. 애플리케이션 실행 (Run Application)
```bash
python run.py
```
> 실행 후 웹 브라우저에서 `http://localhost:5000` 로 접속합니다.

---

## 📝 라이선스 (License)

본 프로젝트는 MIT 라이선스를 따릅니다.
