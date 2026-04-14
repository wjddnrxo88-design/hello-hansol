# Hansol PNS 채용 관리 시스템 - 프로젝트 설계도 (Blueprint)

## 1. 프로젝트 개요
본 프로젝트는 한솔 PNS의 채용 관리 효율화를 위한 웹 기반 시스템입니다. 별도의 백엔드 서버 없이 브라우저 환경에서 React를 통해 동작하며, 모든 데이터는 사용자의 로컬 스토리지에 저장됩니다.

## 2. 기술 스택 및 환경
- **프론트엔드**: React 18 (CDN), Babel (실시간 JSX 변환), Vanilla CSS
- **실행 환경**: 브라우저 직접 실행 (index.html)
- **외부 API**: Anthropic API (Claude 3.5 Sonnet)
- **CORS 해결**: `cors-anywhere` 프록시 서버 사용
- **데이터 저장**: Browser `localStorage`
  - `hpns_jobs`: 채용 공고 데이터
  - `hpns_cands`: 지원자 데이터
  - `hpns_anthropic_key`: 사용자 API 키
  - `hpns_cors_proxy`: 프록시 설정값

## 3. 주요 기능 및 디자인
- **대시보드**: 
  - KPI 카드 (전체 지원, 진행 중, 입사 완료 등)
  - **반응형 단계별 진행 현황**: 브라우저 크기에 맞춰 자동 조절되는 그리드 레이아웃
  - 2주 내 입사 예정자 및 자산 미준비 알림
- **채용 관리**: 
  - 공고 등록/수정/목록 조회
  - 지원자 등록 및 단계별(9단계) 프로세스 관리
- **AI 서류 분석**:
  - 이력서(PDF) 업로드 및 공고 적합도 자동 분석
  - AI 작성 가능성 검토 기능
  - 실제 API 키가 없을 경우를 대비한 **데모 데이터 테스트 모드** 지원
- **데이터 내보내기**: 채용 현황 CSV 다운로드

## 4. 현재 설정 상태 (Environment Settings)
- **GitHub 원격 저장소**: `https://github.com/wjddnrxo88-design/hello-hansol.git`
- **응답성 설정**: 모든 대시보드 위젯에 `auto-fit` 및 `minmax`를 적용하여 모바일/데스크탑 대응 완료
- **보안 설정**: API 키는 코드에 포함되지 않으며 사용자가 UI를 통해 직접 입력하도록 구성됨
