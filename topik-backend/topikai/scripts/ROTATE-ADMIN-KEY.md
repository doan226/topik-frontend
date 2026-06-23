# Huong dan xoay ADMIN_API_KEY tren Render (1 lan)
#
# KEY MOI (da tao san — dan vao Render, KHONG commit file nay len git):
#   Xem file .env.render.new trong cung thu muc scripts
#
# Buoc 1: Render -> topikai2 -> topik-backend-1 -> Environment
# Buoc 2: Sua ADMIN_API_KEY = gia tri trong .env.render.new
# Buoc 3: Save Changes -> Manual Deploy (doi ~2 phut)
# Buoc 4: Chay:
#   copy topik-backend\topikai\.env.render.new topik-backend\topikai\.env.render
#   cd topik-backend\topikai\scripts
#   .\seed-production-via-api.ps1
#   .\security-smoke-test.ps1
#
# Buoc 5: Xoa .env.render.new sau khi xong
