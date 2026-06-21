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
| `username` | `string` | 是 | 用户名、手机号或邮箱 |
| `password` | `string` | 是 | 登录密码 |
| `role` | `string` | 否 | 登录身份，可选值：`user`、`admin` |

## 请求示例

```json
{
  "username": "admin",
  "password": "123456",
  "role": "admin"
}
```

## 成功响应

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    "user": {
      "id": 1,
      "username": "admin",
      "nickname": "管理员",
      "role": "admin"
    }
  }
}
```

## 响应字段说明

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `number` | 业务状态码，`200` 表示成功 |
| `message` | `string` | 响应提示信息 |
| `data.token` | `string` | 登录凭证，前端需要保存并在后续请求中携带 |
| `data.user.id` | `number` | 用户 ID |
| `data.user.username` | `string` | 用户名 |
| `data.user.nickname` | `string` | 用户昵称 |
| `data.user.role` | `string` | 用户身份，`user` 表示普通用户，`admin` 表示管理员 |

## 失败响应

### 参数缺失

```json
{
  "code": 400,
  "message": "用户名或密码不能为空",
  "data": null
}
```

### 用户名或密码错误

```json
{
  "code": 401,
  "message": "用户名或密码错误",
  "data": null
}
```

### 账号被禁用

```json
{
  "code": 403,
  "message": "账号已被禁用，请联系管理员",
  "data": null
}
```

## 前端处理建议

1. 登录成功后保存 `token` 和用户信息。
2. 后续接口请求在请求头中携带：

```http
Authorization: Bearer <token>
```

3. 根据 `user.role` 判断跳转页面：

| 角色 | 跳转页面 |
| --- | --- |
| `user` | `/user-chat` |
| `admin` | `/admin` |

4. 登录失败时直接展示后端返回的 `message`。

## 备注

当前文档为前后端对接约定版本，后续以后端实际接口为准。
