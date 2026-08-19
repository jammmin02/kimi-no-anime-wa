# 배포 가이드 (AWS EC2 + Docker Compose)

`君のアニメは`(키미노아니와)를 AWS EC2 프리 티어(t3.micro / t4g.micro, 1GB RAM) 위에
Docker Compose로 배포하기 위한 절차입니다. 이 디렉터리에 있는 스크립트/설정 파일 안의
주석은 모두 일본어로 작성되어 있으며, 이 문서만 한국어로 작성했습니다.

## 구성 개요

| 파일                                                                 | 역할                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`../Dockerfile`](../Dockerfile)                                     | Next.js standalone 실행 이미지 + 배치(마이그레이션/AniList 동기화) 이미지를 만드는 멀티스테이지 빌드 |
| [`../docker-compose.prod.yml`](../docker-compose.prod.yml)           | 프로덕션용 서비스 정의(app, db, libretranslate, migrate, anilist-sync, ranking-snapshot)             |
| [`../.env.production.example`](../.env.production.example)           | 프로덕션 환경변수 목록(실제 값 없음)                                                                 |
| `setup-ec2.sh`                                                       | EC2 최초 1회 초기 설정(Docker 설치, 스왑 파일 생성 등)                                               |
| `deploy.sh`                                                          | 코드 갱신 시마다 실행하는 배포 스크립트(pull → build → migrate → up)                                 |
| `sync-anilist-cron.sh` / `crontab.example`                           | AniList 배치 동기화를 cron으로 주기 실행                                                             |
| `snapshot-ranking-cron.sh` / `crontab.example`                       | 일일 랭킹 스냅샷 저장을 cron으로 주기 실행                                                           |
| `logrotate.conf`                                                     | cron 로그 파일 로테이션 설정                                                                         |
| [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | (선택) GitHub Actions에서 SSH로 EC2에 배포를 트리거하는 워크플로우                                   |

## 1. EC2 인스턴스 준비

- 인스턴스 타입: `t3.micro` 또는 `t4g.micro`(프리 티어 대상, 1GB RAM)
- AMI: Amazon Linux 2023 또는 Ubuntu 22.04/24.04
- 보안 그룹: `22`(SSH), `80`(앱, `APP_PORT` 기본값) 인바운드 허용. `5000`(LibreTranslate)은
  외부에 노출할 필요가 없다면 막아두는 것을 권장합니다(앱 컨테이너는 같은 Docker 네트워크
  안에서 `libretranslate:5000`으로 접근하므로 포트를 열지 않아도 동작합니다).

SSH로 접속한 뒤 초기 설정 스크립트를 실행합니다.

```bash
git clone <이 저장소 URL> /tmp/kimi-no-anime-wa-bootstrap
cd /tmp/kimi-no-anime-wa-bootstrap
sudo bash deploy/setup-ec2.sh
```

`setup-ec2.sh`가 하는 일:

1. Docker Engine + Docker Compose plugin 설치
2. **스왑 파일(2GB) 생성** — 1GB RAM 인스턴스에서 Next.js 빌드나 LibreTranslate 모델
   로딩 시 OOM으로 죽는 것을 막기 위해 사실상 필수입니다.
3. 앱 배치 디렉터리(`/opt/kimi-no-anime-wa`)와 로그 디렉터리 생성

스크립트 실행 후 한 번 로그아웃했다가 재로그인해야 `docker` 그룹 반영이 적용됩니다.

## 2. 저장소 배치 및 환경변수 설정

```bash
git clone <이 저장소 URL> /opt/kimi-no-anime-wa
cd /opt/kimi-no-anime-wa
cp .env.production.example .env.production
vi .env.production   # 실제 값(DB 비밀번호, JWT_SECRET, ANTHROPIC_API_KEY 등)으로 채우기
```

`.env.production`은 절대 git에 커밋하지 마세요(`.gitignore`의 `.env*` 규칙에 이미 포함됨).

## 3. 최초 배포

```bash
cd /opt/kimi-no-anime-wa
bash deploy/deploy.sh
```

`deploy.sh`가 하는 일:

1. `git pull`로 최신 코드 가져오기
2. `docker compose -f docker-compose.prod.yml --env-file .env.production build`로 이미지 빌드
   (`.env.production`은 Compose 기본 변수 확장 대상 파일(`.env`)이 아니므로, `APP_PORT` 등
   포트 매핑에 쓰이는 값을 반영하려면 `--env-file`을 항상 명시해야 합니다 — `deploy.sh`/
   `sync-anilist-cron.sh`는 이미 내부적으로 이 옵션을 붙여서 실행합니다)
   (`Dockerfile`의 `builder` 스테이지에서 `prisma generate` → `next build`가 실행됩니다)
3. (로컬 DB를 쓰는 경우) `db` 컨테이너 기동
4. `migrate` 원샷 컨테이너로 `prisma migrate deploy` 실행
5. `app`, `libretranslate` 기동
6. 안 쓰는 이전 이미지 정리

배포가 끝나면 `http://<EC2 퍼블릭 IP>` 로 접속해 확인합니다.

이후 코드를 갱신할 때마다 EC2에서 `bash deploy/deploy.sh`만 다시 실행하면 됩니다.

## 4. AniList 배치 동기화를 cron으로 등록

P0-3에서 만든 `npm run sync:anilist`는 사용자 요청마다 호출되는 것이 아니라, 주기적으로
실행되어 DB를 갱신하는 배치입니다. 이 프로젝트에서는 인프라를 단순하게 유지하기 위해
**EC2 내부 cron**을 기본값으로 사용합니다(EventBridge + Lambda 방식은 채택하지 않음).

```bash
crontab -e
```

에디터가 열리면 [`crontab.example`](crontab.example)의 내용을 참고해서 아래와 같은 줄을
추가합니다(경로는 실제 `APP_DIR`에 맞게 수정).

```
10 4 * * * APP_DIR=/opt/kimi-no-anime-wa /opt/kimi-no-anime-wa/deploy/sync-anilist-cron.sh >> /opt/kimi-no-anime-wa/logs/anilist-sync-cron.log 2>&1
```

- 매일 새벽 4시 10분에 `docker compose --profile tools run --rm anilist-sync`를 실행합니다.
- 실행 로그는 `logs/anilist-sync-cron.log`에 누적됩니다.
- 로그가 무한정 쌓이지 않도록 [`logrotate.conf`](logrotate.conf)를 등록해두세요.

```bash
sudo cp deploy/logrotate.conf /etc/logrotate.d/kimi-no-anime-wa
```

cron 등록이 잘 되었는지, 실제로 동작하는지 확인하려면 수동으로 한 번 실행해봅니다.

```bash
bash deploy/sync-anilist-cron.sh
tail -f logs/anilist-sync-cron.log
```

> AniList 레이트리밋 대응(요청 간격, 429 시 Retry-After 대기 등)은 스크립트 자체
> (`server/services/anilist/`)에 이미 구현되어 있으므로, cron 주기는 하루 1회 정도로
> 충분합니다. 필요하면 `.env.production`의 `ANILIST_SYNC_*` 값으로 페이지 수/정렬 기준을
> 조정할 수 있습니다.

## 5. 랭킹 스냅샷 저장을 cron으로 등록 (P2-6)

`npm run snapshot:ranking`은 만화/애니메 각각의 현재 랭킹(자체 리뷰 기준)을 하루 1회
스냅샷으로 DB에 저장하는 배치입니다. 이 스냅샷이 2일치 이상 쌓이면, 랭킹 페이지에 전일
대비 순위 상승/하락이 표시됩니다(스냅샷이 1개뿐이거나 없는 서비스 오픈 첫날에는 변동
표시가 나타나지 않는 것이 정상입니다).

위의 `crontab -e`로 연 에디터에 [`crontab.example`](crontab.example)의 아래 줄도 함께
추가합니다(경로는 실제 `APP_DIR`에 맞게 수정).

```
40 4 * * * APP_DIR=/opt/kimi-no-anime-wa /opt/kimi-no-anime-wa/deploy/snapshot-ranking-cron.sh >> /opt/kimi-no-anime-wa/logs/ranking-snapshot-cron.log 2>&1
```

- 매일 새벽 4시 40분(AniList 동기화가 끝난 뒤)에 `docker compose --profile tools run --rm
ranking-snapshot`을 실행합니다.
- 실행 로그는 `logs/ranking-snapshot-cron.log`에 누적됩니다(로테이션 설정은 AniList 동기화와
  동일하게 [`logrotate.conf`](logrotate.conf)가 커버합니다).

수동으로 한 번 실행해서 확인하려면:

```bash
bash deploy/snapshot-ranking-cron.sh
tail -f logs/ranking-snapshot-cron.log
```

## 6. GitHub Actions로 자동 배포 (선택)

수동으로 SSH 접속해서 `deploy.sh`를 실행하는 대신, `main` 브랜치에 push할 때마다 자동으로
배포하고 싶다면 [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)을 사용할 수
있습니다.

GitHub 저장소 Settings → Secrets and variables → Actions에 아래 시크릿을 등록하세요.

| 이름          | 값                                              |
| ------------- | ----------------------------------------------- |
| `EC2_HOST`    | EC2 퍼블릭 IP 또는 도메인                       |
| `EC2_USER`    | SSH 접속 사용자명(`ec2-user`, `ubuntu` 등)      |
| `EC2_SSH_KEY` | SSH 접속용 PEM 개인키 내용 그대로               |
| `EC2_APP_DIR` | EC2 위 저장소 경로(예: `/opt/kimi-no-anime-wa`) |

등록 후 `main`에 push하면 워크플로우가 EC2에 SSH 접속해서 `deploy/deploy.sh`를 실행합니다.
사용하지 않으려면 이 워크플로우 파일을 그냥 두거나 삭제해도 무방합니다(수동 배포와
독립적으로 동작).

## 7. 나중에 DB를 RDS로 옮길 때

이 프로젝트는 처음부터 `DATABASE_URL` 환경변수 하나로 DB 연결을 관리하도록 설계되어
있어서, RDS로 옮길 때 애플리케이션 코드는 전혀 건드릴 필요가 없습니다.

1. RDS(PostgreSQL, 프리 티어면 `db.t3.micro`/`db.t4g.micro`) 인스턴스를 생성합니다.
2. `.env.production`의 `DATABASE_URL`을 RDS 엔드포인트로 바꿉니다.
   ```
   DATABASE_URL="postgresql://<user>:<password>@<rds-endpoint>:5432/kimi_no_anime_wa?schema=public"
   ```
3. 이후 배포부터는 `db` 서비스를 기동 대상에서 제외합니다. `deploy.sh` 실행 시
   `USE_LOCAL_DB=false bash deploy/deploy.sh`로 실행하면 로컬 `db` 컨테이너를 띄우지
   않습니다.
4. 기존 로컬 DB의 데이터가 남아있다면 `pg_dump` / `pg_restore`(또는 `psql`)로 RDS에
   옮겨줍니다(이 저장소 범위 밖의 일반적인 Postgres 마이그레이션 절차이므로 별도 문서는
   두지 않았습니다).

## 리소스 관련 참고사항 (1GB RAM 인스턴스)

- `docker-compose.prod.yml`의 각 서비스에 `mem_limit`/`mem_reservation`을 설정해서 특정
  컨테이너가 메모리를 독점해 다른 컨테이너를 OOM으로 죽이는 상황을 최대한 방지했습니다.
- LibreTranslate는 `LT_LOAD_ONLY=en,ja,ko`로 로딩 언어를 한/일/영(중계 언어)으로 제한해서
  메모리 사용량을 크게 줄였습니다. 전체 언어를 다 로딩하면 1GB 인스턴스에서는 거의 확실히
  메모리가 부족합니다.
- 그래도 여유가 빠듯하므로 `setup-ec2.sh`가 만드는 스왑 파일을 반드시 활성화한 상태로
  운영하세요. 트래픽이 늘어나면 `t3.small`/`t4g.small`(2GB RAM) 이상으로의 인스턴스
  업그레이드를 검토하는 것이 좋습니다.
