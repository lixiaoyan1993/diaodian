# 单域名部署说明

目标：

- `https://你的域名/` 访问用户端 H5
- `https://你的域名/admin/` 访问后台管理
- `https://你的域名/api/` 转发到 Node 后端

## 打包

在项目根目录执行：

```powershell
npm run build:all
```

打包后：

- 用户端和后台统一在 `client/dist/build/h5`
- 后台入口在 `client/dist/build/h5/admin/index.html`
- 后端入口在 `server/dist/app.js`

## 宝塔网站目录

网站根目录指向：

```text
/www/wwwroot/diaodian/h5
```

## Nginx 伪静态/配置

```nginx
location = /admin {
    return 301 /admin/;
}

location /admin/ {
    try_files $uri $uri/ /admin/index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:3721/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

后台接口已经改为 `/api/admin/*`，所以不会再和 `/admin/` 静态页面冲突。
