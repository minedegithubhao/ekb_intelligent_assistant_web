# 前端对接接口文档

## 通用约定

| 项目 | 说明 |
| --- | --- |
| Base URL | 前端通过 Vite 代理请求 `/api`，代理到 `http://127.0.0.1:8000` |
| Content-Type | `application/json` |
| 认证方式 | `Authorization: Bearer <token>` |
| 成功标识 | `code === 0` |

统一响应结构：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

前端封装文件：

```text
src/api/request.js
src/api/auth.js
src/api/adminUsers.js
src/api/adminConfig.js
src/api/conversation.js
```

## 1. 登录鉴权

### 1.1 登录

```http
POST /api/auth/login
```

请求：

```json
{
  "username": "admin",
  "password": "Admin@123456",
  "login_type": "admin"
}
```

说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | `string` | 是 | 登录账号 |
| `password` | `string` | 是 | 登录密码 |
| `login_type` | `string` | 否 | `admin` 或 `user` |

响应 `data`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `access_token` | `string` | JWT token |
| `token_type` | `string` | 固定为 `bearer` |
| `expires_at` | `string` | token 过期时间 |
| `user` | `object` | 当前登录用户信息 |

`user.category` 与知识库类型映射：

| category | 前端知识库类型 |
| --- | --- |
| `merchant` / `enterprise` | 企业知识库 |
| `individual` / `personal` | 个人知识库 |
| `admin` | 默认企业知识库，管理员可切换 |

### 1.2 获取当前用户

```http
GET /api/auth/me
```

需要登录。

响应 `data` 包含：

```json
{
  "id": 1,
  "username": "admin",
  "name": "系统管理员",
  "display_name": "系统管理员",
  "department": "平台运营部",
  "category": "admin",
  "user_type": "admin",
  "roles": ["admin"],
  "is_admin": true,
  "question_categories": ["enterprise_shop", "individual_shop"],
  "question_category_names": ["企业店规则", "个人个体店规则"]
}
```

### 1.3 登出

```http
POST /api/auth/logout
```

需要登录。后端会将当前 token 加入 Redis blacklist，并将 MySQL session 标记为失效。

### 1.4 管理员校验

```http
GET /api/auth/admin-check
```

需要管理员 token。

## 2. 管理员用户管理

所有接口都需要管理员 token。

### 2.1 用户列表

```http
GET /api/admin/users
```

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `keyword` | `string` | 否 | 搜索账号、姓名或显示名 |
| `role` | `string` | 否 | `admin` 或 `user` |
| `status` | `string` | 否 | `enabled` 或 `disabled` |
| `page` | `number` | 否 | 默认 `1` |
| `page_size` | `number` | 否 | 默认 `100` |

响应 `data`：

```json
{
  "items": [
    {
      "userId": 1,
      "username": "admin",
      "name": "系统管理员",
      "displayName": "系统管理员",
      "email": "admin@example.com",
      "department": "平台运营部",
      "role": "admin",
      "status": "enabled",
      "category": "admin",
      "knowledgeBaseType": "enterprise",
      "knowledgeBaseName": "企业知识库",
      "createdAt": "2026-06-21T13:59:54",
      "updatedAt": "2026-06-21T13:59:54"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 100
}
```

### 2.2 新增用户

```http
POST /api/admin/users
```

请求：

```json
{
  "username": "new_user",
  "password": "User@123456",
  "displayName": "新用户",
  "name": "新用户",
  "email": "new_user@example.com",
  "department": "招商部",
  "role": "user",
  "status": "enabled",
  "category": "merchant"
}
```

说明：

| 字段 | 说明 |
| --- | --- |
| `role` | `admin` 或 `user` |
| `status` | `enabled` 或 `disabled` |
| `category` | 普通用户用 `merchant` 表示企业知识库，`individual` 表示个人知识库；管理员传 `admin` |

### 2.3 编辑用户

```http
PUT /api/admin/users/{user_id}
```

请求字段同新增用户，`password` 可不传；传了则重置密码。

### 2.4 修改用户状态

```http
PATCH /api/admin/users/{user_id}/status
```

请求：

```json
{
  "status": "disabled"
}
```

### 2.5 禁用用户

```http
DELETE /api/admin/users/{user_id}
```

说明：当前实现是禁用账号，不是物理删除。管理员不能禁用自己。

### 2.6 历史会话管理

所有接口都需要管理员 token，用于管理员端隔离查看不同用户的用户端会话历史。

#### 2.6.1 会话用户列表

```http
GET /api/admin/conversations/users
```

响应 `data`：

```json
{
  "items": [
    {
      "userId": 101,
      "username": "merchant_user",
      "displayName": "企业用户A"
    }
  ]
}
```

#### 2.6.2 历史会话列表

```http
GET /api/admin/conversations
```

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `userId` | `number/string` | 否 | 按指定用户隔离查询 |
| `knowledge_base_type` | `string` | 否 | `enterprise` 或 `personal` |
| `keyword` | `string` | 否 | 搜索会话标题或消息内容 |
| `page` | `number` | 否 | 默认 `1` |
| `page_size` | `number` | 否 | 默认 `100` |

响应 `data`：

```json
{
  "items": [
    {
      "conversationId": "conv_10001",
      "userId": 101,
      "username": "merchant_user",
      "displayName": "企业用户A",
      "title": "企业店保证金咨询",
      "knowledgeBaseType": "enterprise",
      "knowledgeBaseName": "企业知识库",
      "messageCount": 4,
      "lastMessageAt": "2026-06-22 09:35:12"
    }
  ],
  "total": 1
}
```

#### 2.6.3 会话消息列表

```http
GET /api/admin/conversations/{conversation_id}/messages
```

响应 `data`：

```json
{
  "items": [
    {
      "messageId": "msg_10001_1",
      "role": "user",
      "content": "企业店保证金怎么收取？",
      "createdAt": "2026-06-22 09:31:02"
    }
  ]
}
```

#### 2.6.4 删除指定历史会话

```http
DELETE /api/admin/conversations/{conversation_id}
```

说明：删除指定用户的一条历史会话记录，同时应删除该会话下的消息明细。

## 3. 仪表台参数配置

所有接口都需要管理员 token。

### 3.1 获取当前生效配置

```http
GET /api/admin/dashboard/config
```

响应 `data`：

```json
{
  "source": "mysql",
  "version": {
    "id": 1,
    "config_key": "retrieval",
    "version_no": 1,
    "status": "active"
  },
  "model": "qwen-plus",
  "embedding_model": "bge-m3",
  "rerank_model": "bge-reranker-v2-m3",
  "variant_generation_enabled": true,
  "rerank_enabled": true,
  "top_k": {
    "faq": 20,
    "doc": 20,
    "rerank": 8,
    "final_evidence": 6
  },
  "thresholds": {
    "faq_high_conf": 0.85,
    "faq_middle_conf": 0.65,
    "doc_evidence": 0.55
  },
  "weights": {
    "faq_dense": 0.5,
    "faq_sparse": 0.5,
    "doc_dense": 0.7,
    "doc_sparse": 0.3
  },
  "raw": {}
}
```

说明：前端修改参数时，应基于 `raw` 复制一份完整配置，只覆盖用户编辑的字段，再保存为新版本。

### 3.2 配置版本列表

```http
GET /api/admin/config/versions
```

### 3.3 新增配置版本

```http
POST /api/admin/config/versions
```

请求：

```json
{
  "config": {
    "model": "qwen-plus",
    "embedding_model": "bge-m3",
    "rerank_model": "bge-reranker-v2-m3",
    "faq_k": 20,
    "doc_k": 20,
    "rerank_top_k": 8,
    "variant_generation_enabled": true,
    "rerank_enabled": true
  },
  "description": "调整仪表台参数",
  "activate": true
}
```

说明：

- `config` 应提交完整配置，不建议只传单个字段。
- `activate=true` 表示保存后立即启用。
- 启用新版本后，旧 active 版本会变成 `archived`。

### 3.4 启用指定配置版本

```http
POST /api/admin/config/versions/{version_id}/activate
```

## 4. 用户端聊天接口预留

当前前端只预留接口封装，后端真实聊天/RAG 还未实现。

### 4.1 会话列表

```http
GET /api/conversations?knowledge_base_type=enterprise
```

### 4.2 新建会话

```http
POST /api/conversations
```

请求：

```json
{
  "knowledge_base_type": "enterprise"
}
```

### 4.3 会话消息列表

```http
GET /api/conversations/{conversation_id}/messages?knowledge_base_type=enterprise
```

### 4.4 删除会话

```http
DELETE /api/conversations/{conversation_id}
```

### 4.5 发送问题

```http
POST /api/conversations/{conversation_id}/messages
```

请求：

```json
{
  "question": "企业店保证金怎么收取？",
  "knowledge_base_type": "enterprise"
}
```

## 5. 系统健康检查

### 5.1 服务健康

```http
GET /api/health
```

### 5.2 依赖健康

```http
GET /api/health/dependencies
```

## 6. 常见错误

| HTTP 状态 | code | 说明 |
| --- | --- | --- |
| 400 | `40000` | 请求参数或业务校验失败 |
| 401 | `40100` | 未登录、token 失效、session 失效 |
| 403 | `40300` | 权限不足，例如普通用户访问管理员接口 |
| 422 | `42200` | 请求字段校验失败 |
| 500 | `50000` | 服务内部异常 |
