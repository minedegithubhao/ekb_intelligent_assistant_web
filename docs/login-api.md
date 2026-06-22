# 登录接口文档

## 基本信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 用户登录 |
| 请求方式 | `POST` |
| 请求地址 | `/api/auth/login` |
| Content-Type | `application/json` |
| 是否需要登录 | 否 |

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | `string` | 是 | 登录账号 |
| `password` | `string` | 是 | 登录密码，当前后端使用 `pbkdf2_sha256` 校验 |
| `login_type` | `string` | 否 | 登录端类型，可选：`user`、`admin` |

## 请求示例

```json
{
  "username": "admin",
  "password": "Admin@123456",
  "login_type": "admin"
}
```

## 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "access_token": "jwt-token",
    "token_type": "bearer",
    "expires_at": "2026-06-22T03:06:56.823404Z",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "系统管理员",
      "display_name": "系统管理员",
      "email": "admin@example.com",
      "department": "平台运营部",
      "category": "admin",
      "user_type": "admin",
      "roles": [
        {
          "code": "admin",
          "name": "管理员"
        }
      ],
      "question_categories": ["enterprise_shop", "individual_shop"],
      "question_category_names": ["企业店规则", "个人个体店规则"]
    }
  }
}
```

## 前端处理

登录成功后保存：

```text
localStorage.token = data.access_token
localStorage.userInfo = JSON.stringify(data.user)
localStorage.roles = JSON.stringify(data.user.roles.map(item => item.code))
```

后续接口请求头携带：

```http
Authorization: Bearer <token>
```

普通用户跳转 `/user-chat`，管理员跳转 `/admin`。

## 失败响应示例

```json
{
  "code": 40300,
  "message": "admin role required",
  "data": {}
}
```

更多接口见 [完整接口文档](api.md)。
