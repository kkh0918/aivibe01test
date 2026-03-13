# Web App 개발 가이드

이 프로젝트는 **Frontend + Backend + Database** 3계층 구조로 구성된 웹 앱을 만드는 표준 가이드입니다.

---

## 기술 스택

| 계층 | 기술 | 역할 |
|------|------|------|
| **Frontend** | HTML + CSS + Vanilla JS | UI, 사용자 인터랙션 |
| **Backend** | Supabase (BaaS) | REST API, 인증, Realtime |
| **Database** | PostgreSQL (Supabase 내장) | 데이터 영구 저장 |

---

## 프로젝트 구조

```
project/
├── index.html      # HTML 구조 (마크업만, 스크립트·스타일 분리)
├── style.css       # 모든 스타일 (CSS Variables, 다크모드 포함)
├── app.js          # 비즈니스 로직 + Supabase CRUD + Realtime
├── config.js       # Supabase URL / anon key (환경 설정)
├── schema.sql      # DB 테이블 정의 (Supabase SQL Editor에서 실행)
├── CLAUDE.md       # 이 파일
└── .gitignore
```

---

## 개발 규칙

### HTML (index.html)
- 마크업 구조만 작성, 인라인 `<style>` / `<script>` 금지
- `<link rel="stylesheet" href="style.css">` 로 스타일 연결
- 스크립트 로드 순서: `supabase CDN → config.js → app.js`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` 필수

### CSS (style.css)
- 파일 상단에 `:root` CSS Variables 정의 (색상, 그림자 등)
- `@media (prefers-color-scheme: dark)` 로 다크모드 지원
- 섹션별 주석으로 구분: Reset / Variables / Header / Components 등
- 모바일 퍼스트 작성, 필요 시 `@media (min-width: 768px)` 추가

### JavaScript (app.js)
- 파일 상단에 Supabase 클라이언트 초기화
- **State** → **Utility** → **Supabase CRUD** → **Render** → **Event Listeners** 순서로 구성
- 모든 Supabase 호출은 `async/await` + 에러 처리 필수
- DOM 조작은 `render()` 함수 하나로 집중 관리
- 이벤트는 가능한 한 **이벤트 위임(delegation)** 사용

### config.js
- `window.APP_CONFIG` 객체에 환경 설정 값 저장
- `supabaseUrl`, `supabaseAnonKey` 필수 포함
- `.gitignore`에 추가하거나, 민감 정보는 환경변수로 분리

---

## Database 설계 원칙

```sql
-- 기본 테이블 구조
CREATE TABLE public.테이블명 (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 도메인 컬럼들
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거 (항상 추가)
-- Row Level Security (RLS) 항상 활성화
-- Realtime 필요 시 publication에 추가
```

**필수 적용 사항:**
- 모든 테이블에 RLS 활성화 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- `updated_at` 자동 갱신 트리거 추가
- 인증 없는 데모: `USING (true)` 정책 / 실서비스: `auth.uid()` 기반 정책

---

## Supabase 연동 패턴

```js
// 클라이언트 초기화
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 조회
const { data, error } = await supabase
  .from('테이블명')
  .select('*')
  .order('created_at', { ascending: false });

// 삽입
const { data, error } = await supabase
  .from('테이블명')
  .insert([{ 컬럼: 값 }])
  .select()
  .single();

// 수정
const { data, error } = await supabase
  .from('테이블명')
  .update({ 컬럼: 값 })
  .eq('id', id)
  .select()
  .single();

// 삭제
const { error } = await supabase
  .from('테이블명')
  .delete()
  .eq('id', id);

// Realtime 구독
supabase
  .channel('테이블명-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: '테이블명' }, () => {
    fetchData(); // 변경 시 전체 재조회
  })
  .subscribe();
```

---

## UX 필수 요소

| 요소 | 구현 방법 |
|------|----------|
| **로딩 표시** | API 호출 중 상단 로딩 바 또는 버튼 비활성화 |
| **에러 알림** | Toast 메시지 (성공: 기본색, 실패: 빨간색) |
| **빈 상태** | 데이터 없을 때 이모지 + 안내 문구 표시 |
| **낙관적 업데이트** | 가능하면 UI 먼저 반영 후 API 호출 |

---

## 배포 (GitHub Pages)

```bash
# 1. git 초기화 및 커밋
git init
git add index.html style.css app.js config.js schema.sql .gitignore
git commit -m "Initial commit"

# 2. GitHub 저장소 생성 후 push
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# 3. GitHub Pages 활성화 (GitHub API)
curl -X POST \
  -H "Authorization: token GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/USERNAME/REPO/pages \
  -d '{"source":{"branch":"main","path":"/"}}'
```

배포 URL: `https://USERNAME.github.io/REPO/`

---

## 새 앱 개발 체크리스트

- [ ] `index.html` — 구조 작성, script/style 분리 확인
- [ ] `style.css` — CSS Variables, 다크모드, 모바일 반응형
- [ ] `schema.sql` — 테이블 생성, RLS, 트리거, Realtime 설정
- [ ] `config.js` — Supabase URL / anon key 입력
- [ ] `app.js` — CRUD 함수, render(), 이벤트 리스너, Realtime 구독
- [ ] 로딩 / 에러 / 빈 상태 UI 구현
- [ ] `.gitignore` 에 `.DS_Store` 추가
- [ ] GitHub push + Pages 배포
