# HANDOFF: E2E Pipeline POC

> Cập nhật: 2026-10-29 · Vị trí: `C:\Go\POC` · Người làm: Claude Code + user
> Đọc file này trước khi tiếp tục, dù là người hay AI.

## 1. Mục tiêu

Dựng pipeline **GitHub Actions** chạy E2E **Playwright** mỗi khi có Pull Request. Demo 3 luồng trên **cùng 1 pipeline**:

| Luồng | Thay đổi trong PR | Kết quả mong đợi |
|---|---|---|
| **1. Bình thường** | Thêm comment vào code (có đụng file code, không đổi logic) | E2E ✅ pass → được merge |
| **2. Nâng cao** | Refactor BE, cài sẵn lỗi lưu sai `price`: **UI vẫn đúng, DB sai** | E2E ❌ fail ở bước **Verify DB** → **chặn merge** |
| **3. AI-DLC** | FE đổi nhẹ (đổi `data-testid`, text nút) làm locator gãy hoặc test flaky | AI (Claude Code) tự heal test → chạy lại pass → người review commit heal |

Testcase dùng chung: **Login → đếm số sản phẩm (N) → thêm 1 → verify sản phẩm trên UI → verify số lượng = N+1 → verify DB → xoá sản phẩm test.**

## 2. Quyết định đã chốt

| Hạng mục | Quyết định |
|---|---|
| CI | GitHub Actions, 1 pipeline chung |
| Môi trường test | Dựng tạm bằng Docker Compose ngay trong runner (db + be + fe thật), chạy xong thì huỷ. Free, không phụ thuộc host |
| Luồng 2 | Kiểu A: regression thật, fail ở bước Verify DB (không phải lỗi selector) |
| Chặn PR | Nghĩa là **chặn merge** bằng branch protection + required status check `e2e` |
| Cleanup | Xoá sản phẩm test sau mỗi lần chạy, kể cả khi test fail |
| Luồng 3 | Chỉ heal **lỗi locator**, tuyệt đối **không heal lỗi assertion** (nếu heal sẽ che bug của Luồng 2). Commit heal phải có người approve. User đã có ý tưởng dùng Claude Code, **sẽ mô tả sau** |
| Repo GitHub | Phải để **public**: GitHub Free chỉ cho branch protection trên repo public, và repo public được dùng Actions không giới hạn phút |
| Host luôn bật (tuỳ chọn) | Nếu cần URL public: Oracle Cloud Always Free VM chạy cùng file `docker-compose.yml`. Chưa làm |
| Cách làm | **Chuẩn bị toàn bộ ở local**, sau đó demo trên GitHub Actions |

## 3. Ràng buộc môi trường (quan trọng)

- **Mọi thứ chạy trong Docker**: build BE, cài package cho E2E, chạy Playwright. Máy chỉ cần Docker Desktop và npm để gọi script.
  Lý do: máy dùng để chuẩn bị ban đầu chặn `node.exe` ra Internet. Giữ nguyên thiết kế này vì CI cũng chạy đúng các lệnh đó.
  → Muốn tạo hoặc cập nhật lockfile thì chạy npm trong container (từ thư mục gốc project, PowerShell):
  `docker run --rm -v "${PWD}:/app" -w /app node:22-alpine npm install --package-lock-only`
- **Máy hiện tại** (`C:\Go\POC`): Node có mạng, nhưng **chưa cài Docker Desktop và `gh`**. Chưa `git init`, chưa commit.
- Repo sẽ để **public**: không ghi đường dẫn cá nhân, tên user máy hay thông tin nội bộ vào bất kỳ file nào.

## 4. ✅ Đã làm

### P1: App POC (xong, đã test)
- `app/db/init.sql`: Postgres 16, bảng `users`, `sessions`, `products(price INTEGER, đơn vị VND)`. Seed user `testuser / Test@123` và 3 sản phẩm.
- `app/be/`: Express 5 + pg. API `POST /api/login`, `GET/POST /api/products`, `DELETE /api/products/:id`, `GET /api/health`.
- `app/fe/`: HTML/JS thuần + nginx (proxy `/api` sang be). Mọi element cần test đều có `data-testid`.
- `docker-compose.yml`: db (port host `5433`), be, fe (`8080`), đều có healthcheck.

### P2: E2E (xong, đã chạy pass)
- `e2e/tests/product.spec.ts`: 1 test gồm 6 `test.step` khớp với flow ở mục 1.
- `e2e/fixtures.ts`: fixture `testProduct` tạo tên sản phẩm duy nhất `E2E-Product-<timestamp>-<worker>` và tự xoá trong DB khi test kết thúc.
- `e2e/utils/db.ts`: query thẳng DB để verify và cleanup.
- `e2e/playwright.config.ts`: trên CI thì `retries: 1` và `forbidOnly`. `actionTimeout: 10s` để locator gãy fail nhanh với lỗi rõ ràng. Reporter gồm list, html và json (json dùng để phân loại lỗi cho Luồng 3). Trace, screenshot, video chỉ giữ khi fail.
- `e2e/Dockerfile`: image `mcr.microsoft.com/playwright:v1.64.1-noble`. **Version image phải khớp `@playwright/test` trong `package.json`.**
- Service `e2e` trong compose dùng profile `test`. Thư mục `e2e/` được mount vào container nên sửa test không cần build lại, và report sinh ra trên máy host.
- Kết quả đã kiểm chứng: `1 passed`, DB còn đúng 3 sản phẩm (không sót bản ghi test), có `playwright-report/index.html` và `results.json`.

### Lỗi đã gặp và đã sửa (để không lặp lại)
| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| fe báo `unhealthy` | Trong Alpine, `localhost` resolve ra IPv6 `::1`, còn nginx chỉ nghe IPv4 | Healthcheck dùng `127.0.0.1` |
| `npm run report` báo port 8081 đã bị chiếm | `--service-ports` mở mọi port của service cho mỗi lần `run`, nên UI mode và report đụng nhau | Bỏ `ports` của service `e2e`. Mỗi script tự `-p` đúng port nó cần (UI 8081, report 9323) |
| `npm install` treo hoặc báo `EACCES` | Firewall chặn node.exe | Chạy npm trong Docker (xem mục 3) |
| Git đổi file sang CRLF trên Windows | Git for Windows mặc định `core.autocrlf=true` | `.gitattributes` ép LF cho cả repo (file chạy trong container Linux cần LF) |

### Sửa sau review code (2026-10-29)
| Lỗi | Cách sửa |
|---|---|
| Bỏ trống giá vẫn tạo được sản phẩm giá 0 (`Number('')` = 0, form có `novalidate`) | FE gửi `price: null` khi ô trống → BE trả 400 (`app/fe/public/js/products.js`) |
| Giá > 2.147.483.647 gây lỗi 500 (vượt `INTEGER`) | `validate()` chặn bằng `MAX_PRICE` (`app/be/src/products.js`) |
| Locator gãy phải chờ hết test timeout 30s, lỗi chung chung | Thêm `actionTimeout: 10_000` (`e2e/playwright.config.ts`) |

⚠️ Đã kiểm tra cú pháp và type-check (`tsc --strict`), nhưng **chưa chạy lại E2E** sau các sửa này vì máy hiện tại chưa có Docker.

### P3: Workflow GitHub Actions (viết xong, chưa chạy trên GitHub)
- `.github/workflows/e2e.yml`: trigger `pull_request` vào `main` (kèm `workflow_dispatch`), **không dùng `paths-ignore`**, `concurrency` theo số PR với `cancel-in-progress`.
- Các bước: checkout → `docker compose run --rm --build e2e` với `CI=true` → khi fail thì in log db/be/fe → upload `playwright-report` và `test-results` làm artifact (giữ 14 ngày) → tóm tắt → `docker compose down -v`.
- Job tên `e2e`: đây là tên required check khi bật branch protection.
- `.github/scripts/e2e-summary.js`: đọc `results.json` để viết job summary và **1 comment trên PR**, comment này được cập nhật lại sau mỗi lần push thay vì tạo comment mới. Nội dung: pass / fail / flaky, step nào fail, lỗi rút gọn, link artifact, link log.
  Bước này có `continue-on-error`, nên lỗi khi tóm tắt không chặn merge. PR từ fork chỉ có token read-only nên không comment được, khi đó chỉ ghi warning.
- Action dùng bản mới, đều chạy Node 24: `checkout@v7`, `upload-artifact@v7`, `github-script@v9`.
- Đã kiểm chứng ở local: `actionlint` 1.7.12 không lỗi. Script tóm tắt chạy đúng với `results.json` thật và các tình huống giả lập (Luồng 2 fail ở step 6, flaky, không có kết quả, PR fork bị 403, cập nhật comment cũ).
- **Chưa chạy thật trên GitHub**, việc này làm ở P6.

### P4: Demo Luồng 1 và 2: user tự sửa code (không dùng script dựng sẵn)
User quyết định tự sửa code và tự mở PR. Script demo đã viết trước đó đã được gỡ.
- **Luồng 1:** branch mới → thêm 1 comment bất kỳ vào `app/be/src/products.js` → commit → push → mở PR. Mong đợi: check `e2e` pass, PR merge được.
- **Luồng 2:** branch mới từ `main` → trong `app/be/src/products.js`, lưu `price * 100` khi INSERT (hàm `create`) và trả `row.price / 100` khi đọc (`toProduct`) → PR.
  Mong đợi: sản phẩm mới hiển thị đúng trên UI, check `e2e` fail ở **Step 6 Verify DB** (expected 100000, received 10000000), merge bị chặn.
  Hệ quả phụ: 3 sản phẩm seed hiển thị giá nhỏ đi 100 lần. Không merge PR này.

### Lệnh dùng được ngay
```powershell
cd C:\Go\POC
npm run app:up        # http://localhost:8080
npm run test:e2e      # chạy E2E trong container
npm run test:e2e:ui   # UI mode: http://localhost:8081
npm run report        # HTML report + trace: http://localhost:9323
npm run app:reset     # xoá DB, dựng lại từ seed
```

## 5. 🔄 Đang làm

- P3 đã viết xong. User đã tải Docker Desktop, đang tự đẩy code lên GitHub (P6) và tự làm Luồng 1, 2.
- Chạy `npm run test:e2e` để xác nhận vẫn `1 passed` sau các sửa ở mục 4, **trước** khi push lên GitHub.
- User cần xác nhận lại `npm run report` chạy được sau khi sửa lỗi port (tắt container UI mode cũ bằng `Ctrl+C` trước).

## 6. ⏭️ Sắp làm

### P3 (phần còn lại, tuỳ chọn)
- Publish HTML report lên GitHub Pages.
- Có thể chạy thử workflow ở local bằng `act` (chạy GitHub Actions trên Docker) sau khi cài Docker.

### P5: Luồng 3 AI-DLC (chờ user mô tả)
- Ý tưởng đã thống nhất: phân loại lỗi từ `results.json`. Lỗi locator hoặc timeout thì gọi Claude Code để heal. Lỗi assertion thì là regression, không heal. Pass khi retry thì là flaky.
- Kịch bản dự kiến: 3a đổi `data-testid="add-btn"` thành `"create-product-btn"`. 3b (tuỳ chọn) FE render nút trễ ngẫu nhiên để tạo flaky.
- Chỉ phần này cần API key (Claude). Các phần khác đều free.

### P6: Lên GitHub
1. `git init -b main` → commit (gồm cả `.github/` và `.gitattributes`) → tạo repo **public** → push `main`. Workflow phải có sẵn trên `main` trước khi mở PR đầu tiên.
2. Mở 1 PR (Luồng 1) để workflow chạy ít nhất 1 lần. **Check `e2e` chỉ hiện trong danh sách chọn của branch protection sau khi đã chạy ít nhất 1 lần.**
3. Bật branch protection (hoặc ruleset) cho `main`: Require a pull request before merging + Require status checks to pass, chọn `e2e`.
4. Làm Luồng 2 (mục P4) để thấy merge bị chặn.

### P7 (tuỳ chọn): Host luôn bật
Oracle Cloud Always Free VM: cài Docker, chạy `docker compose up -d`. Sau khi merge vào main thì tự deploy và chạy smoke test.
**Bỏ port `5433:5432` của db** (dùng file override cho VM), nếu không DB với mật khẩu `poc/poc` sẽ lộ ra Internet.

### Ghi chú cho sau này
- Bước "số lượng = N+1" đếm toàn bảng, trong khi `fullyParallel: true`. Khi thêm test khác cũng tạo sản phẩm, bước này sẽ chập chờn. Lúc đó cần tách DB/dữ liệu theo worker hoặc chạy các test đó tuần tự.

## 7. Cấu trúc thư mục hiện tại

```
C:\Go\POC
├─ HANDOFF.md              ← file này
├─ README.md               hướng dẫn lệnh
├─ package.json            npm scripts + deps E2E (@playwright/test 1.64.1, pg)
├─ package-lock.json
├─ docker-compose.yml      db, be, fe, e2e (profile "test")
├─ .dockerignore / .gitignore / .gitattributes (ép LF)
├─ .github/
│  ├─ workflows/e2e.yml    CI: chạy E2E mỗi PR, job `e2e` = required check
│  └─ scripts/e2e-summary.js  results.json → job summary + comment PR
├─ app/
│  ├─ db/init.sql
│  ├─ be/  (Dockerfile, package.json, package-lock.json, src/{server,db,auth,products}.js)
│  └─ fe/  (Dockerfile, nginx.conf, public/{index,products}.html, js/, css/)
└─ e2e/
   ├─ Dockerfile, playwright.config.ts, fixtures.ts
   ├─ tests/product.spec.ts
   └─ utils/db.ts
```
