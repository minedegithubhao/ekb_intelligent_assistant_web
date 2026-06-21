# ekb_intelligent_assistant_web

前端项目目录骨架。

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

## 说明

当前仓库仅保留前端基础目录结构，后续代码请按功能放入对应目录。

- `api`：统一管理后端接口请求。
- `router`：统一管理页面路由。
- `stores`：统一管理全局状态。
- `layouts`：存放整体布局相关组件。
- `views`：存放页面级模块。
- `components`：存放可复用通用组件。
- `utils`：存放通用工具方法。