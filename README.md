# ekb_intelligent_assistant_web

EKB 智能助手前端项目，基于 Vue 3、Vite 和 Element Plus 构建。

## 运行方式

```bash
npm install
npm run dev
```

开发服务器启动后访问：

```text
http://localhost:5173/
```

## 构建方式

```bash
npm run build
```

## 目录结构

```text
src/
  api/              接口请求封装
  router/           前端路由配置
  stores/           状态管理
  layouts/          页面布局组件
  views/
    login/          登录页
    user-chat/      用户问答/聊天页面
    admin/          管理端页面
  components/       通用组件
  utils/            工具函数
```

## 页面说明

- `/login`：登录页面，支持普通用户和管理员身份切换。
- `/user-chat`：用户问答页面。
- `/admin`：后台管理页面，包含仪表台参数、用户管理、知识库管理和评估管理。

## 开发说明

- `api`：统一管理后端接口请求。
- `router`：统一管理页面路由。
- `stores`：统一管理全局状态。
- `layouts`：存放整体布局相关组件。
- `views`：存放页面级模块。
- `components`：存放可复用通用组件。
- `utils`：存放通用工具方法。

## 接口文档

- [完整接口文档](docs/api.md)
- [登录接口文档](docs/login-api.md)
