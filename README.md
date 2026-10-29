# E2E Pipeline POC

Demo app (Postgres + Express + nginx/HTML) và E2E Playwright, chạy hoàn toàn trong Docker.
Máy chỉ cần **Docker Desktop** và **npm** (chỉ để gọi script, không cần tải package về máy).

## Lệnh

| Lệnh | Việc làm |
|---|---|
| `npm run app:up` | Dựng db + be + fe, đợi tất cả healthy. Mở http://localhost:8080 |
| `npm run app:down` | Dừng app |
| `npm run app:reset` | Xoá DB và dựng lại từ đầu với seed data |
| `npm run app:logs` | Xem log |
| `npm run test:e2e` | Chạy E2E (tự dựng app nếu chưa chạy) |
| `npm run test:e2e:ui` | Playwright UI mode. Mở http://localhost:8081 |
| `npm run report` | Xem HTML report và trace của lần chạy gần nhất. Mở http://localhost:9323 |

Tài khoản test: `testuser` / `Test@123`. DB mở port `5433` (user/pass/db: `poc`).

## Testcase

`e2e/tests/product.spec.ts`: Login → đếm số sản phẩm → thêm 1 → verify sản phẩm trên UI
→ verify số lượng +1 → verify bản ghi trong DB. Sản phẩm test được xoá sau khi chạy, kể cả khi test fail.

## CI (GitHub Actions)

`.github/workflows/e2e.yml` chạy với mỗi PR vào `main`, dùng đúng lệnh `docker compose run --rm --build e2e` như ở local.
Kết quả: job `e2e` (đặt làm required check), artifact chứa HTML report và trace,
và 1 comment tóm tắt trên PR (pass/fail, bước nào fail, lỗi), được cập nhật lại sau mỗi lần push.

## Cấu trúc

```
app/db/init.sql        schema + seed
app/be/                Express API (login, products)
app/fe/                HTML/JS tĩnh + nginx (proxy /api → be)
e2e/                   Playwright config, tests, fixtures, DB helper, Dockerfile
docker-compose.yml     db, be, fe + e2e (profile "test")
.github/               workflow E2E + script tóm tắt kết quả lên PR```
