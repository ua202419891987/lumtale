# LumTale 部署步骤清单（GitHub + Cloudflare Pages 集成）

> 方案优点：不用 ZIP、不用命令行直传 Cloudflare（绕开 POST 被丢的坑）。
> 改完代码 `git push` 自动部署，后续维护成本极低。

---

## 〇、文件已备好（本目录现有）

```
D:\网站下载文件专栏\lumtale\
├── index.html            ← 落地页（表单已改走 Worker，无 Web3Forms 依赖）
├── functions\
│   └── waitlist.js       ← 表单处理（Cloudflare Pages Function）
└── cf_token.txt          ← ⚠️ 含密钥，千万别传！已用 .gitignore 排除
```

---

## 一、本机装 Git（若已装可跳过）

打开 PowerShell，逐条执行：

```powershell
# 检查是否已装
git --version
gh --version    # GitHub CLI，可选但推荐

# 没装就装（需管理员 PowerShell）
winget install Git.Git
winget install GitHub.cli
```

装完**重开一个 PowerShell** 让 PATH 生效。

---

## 二、本机建仓库并推到 GitHub

```powershell
cd "D:\网站下载文件专栏\lumtale"

# 1. 初始化
git init

# 2. 排除密钥文件（重要！）
echo cf_token.txt > .gitignore

# 3. 添加并提交（只加这两个，cf_token 被忽略）
git add index.html functions/waitlist.js .gitignore
git commit -m "Initial: LumTale landing page + waitlist worker"
```

### 方式 A：用 GitHub CLI（推荐，最简单）

```powershell
gh auth login          # 首次需按提示用浏览器授权 GitHub
gh repo create lumtale --public --source=. --push --description "LumTale landing page"
```

### 方式 B：不用 CLI，手动建仓库

1. 打开 https://github.com/new
2. Repository name 填 `lumtale`，选 **Public**，其他默认，点 **Create repository**
3. 回到 PowerShell：

```powershell
git remote add origin https://github.com/你的用户名/lumtale.git
git branch -M main
git push -u origin main
```

---

## 三、Cloudflare 连 GitHub 自动部署

1. 登录 https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. 选 **"Connect to Git"** → 授权 GitHub → 选仓库 **`lumtale`**
3. 构建配置（关键，照抄）：
   - **Framework preset**：`None`
   - **Build command**：留空
   - **Build output directory**：留空
   - **Root directory**：留空
4. 点 **"Save and Deploy"**
5. 等 1–2 分钟出现绿色 **Success** → 访问 `https://lumtale.pages.dev` 验证页面

> 注：之前那个空的 `lumtale` Pages 项目可忽略/删除，新部署会建一个干净的 GitHub 关联项目。
> 若提示项目名已存在，删掉旧的或换个名字（如 `lumtale-site`）即可。

---

## 四、绑定自定义域名 lumtale.com

1. 进 Pages 项目 → **Custom domains** → **Set up a custom domain**
2. 输入 `lumtale.com` → 确认
3. Cloudflare 自动补 DNS CNAME（因为 lumtale.com 的 NS 已是 Cloudflare）
4. 等 1–5 分钟 → 访问 **https://lumtale.com** 应为 200，403 消失

---

## 五、后续更新流程（以后改文案就一行）

```powershell
cd "D:\网站下载文件专栏\lumtale"
# 改完 index.html 后：
git add -A
git commit -m "更新落地页文案"
git push
```

Cloudflare 检测到推送后**自动重新部署**，无需任何手动操作。

---

## 六、收尾安全提醒

- 部署跑通后，**删除 `cf_token.txt`**（里面是有效 Token，留着有泄露风险）。
  登录 Cloudflare → Profile → API Tokens → 把 `lumtale-pages-deploy` 也 revoke 掉（GitHub 集成不再需要它）。
- 表单目前只把邮箱打到 Worker 日志（`console.log`）。要真正收邮件，后续接 KV/D1 或转发邮箱即可，届时我帮你加。

---

## 七、验证清单

- [ ] `lumtale.pages.dev` 打开是落地页（非 404）
- [ ] `lumtale.com` 打开是同一页面，HTTPS 绿锁
- [ ] 填邮箱点 Join → 显示 "You're on the list."
- [ ] Cloudflare 控制台 Workers Logs 能看到 signup 日志
- [ ] `cf_token.txt` 已删除 + Token 已 revoke
