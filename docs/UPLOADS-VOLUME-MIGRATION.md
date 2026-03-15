# Uploads 卷迁移指南：从命名卷切换到绑定挂载

当把 API 的 uploads 从 **Docker 命名卷** 改为 **宿主机目录绑定挂载** 后，之前上传的图片等资源会“消失”——因为数据仍在旧卷里，而容器现在挂的是新目录。本文说明如何把旧卷中的资源迁移到新的挂载目录。

---

## 一、背景说明

### 1.1 两种挂载方式

| 方式 | 配置示例 | 数据位置 | 特点 |
|------|----------|----------|------|
| **命名卷** | `volumes: - uploads_data:/app/apps/api/uploads`，并在顶层声明 `uploads_data: driver: local` | Docker 管理的卷（如 `/var/lib/docker/volumes/<项目名>_uploads_data/_data`） | 与项目路径解耦，迁移/备份需通过 Docker 操作 |
| **绑定挂载** | `volumes: - ./apps/api/uploads:/app/apps/api/uploads` | 宿主机项目目录下的 `./apps/api/uploads` | 直接可见、易备份（rsync/scp）、与代码同机管理 |

### 1.2 为什么改挂载后“找不到”之前的资源

- 之前：容器内 `/app/apps/api/uploads` 指向**命名卷**，上传的文件写在该卷里。
- 修改 compose 后：同一路径改为指向**宿主机目录** `./apps/api/uploads`。若该目录为空或从未同步，则容器内看到的也是空的。
- 旧文件仍在**原命名卷**中，只是当前 compose 不再挂载该卷，所以 API 读不到。

因此需要在**不删除旧卷**的前提下，把命名卷里的数据**拷贝到**新的绑定挂载目录。

---

## 二、迁移前准备

### 2.1 确认当前 compose 的挂载方式

确认生产用的 compose 已改为绑定挂载，例如：

```yaml
# docker-compose.prod.yml 或 docker-compose.prod.pull.yml 中 api 服务
api:
  environment:
    UPLOAD_DIR: /app/apps/api/uploads
    UPLOAD_BASE_URL: ${HOST:-https://www.xyan.store}
  volumes:
    - ./apps/api/uploads:/app/apps/api/uploads
```

即宿主机目录 `./apps/api/uploads` 挂到容器内 `/app/apps/api/uploads`。

### 2.2 在服务器上进入项目根目录

所有以下命令均在**项目根目录**（包含 `docker-compose.prod.yml` 的目录）执行：

```bash
cd /path/to/kenanyah-blog   # 替换为你的项目路径
```

### 2.3 确保目标目录存在

```bash
mkdir -p apps/api/uploads
```

---

## 三、查找旧卷名称

Docker 命名卷的默认命名规则为：`<compose 项目名>_<卷名>`。例如卷在 compose 中名为 `uploads_data`、项目名为 `kenanyah-blog`，则卷名为 `kenanyah-blog_uploads_data`。

### 3.1 列出可能相关的卷

```bash
docker volume ls | grep -E 'upload|blog'
```

示例输出：

```text
local     kenanyah-blog_uploads_data
```

记下这里的卷名（如 `kenanyah-blog_uploads_data`），后续命令中的 `<旧卷名>` 均替换为此名称。

### 3.2 可选：查看卷内文件结构

确认卷内确有数据再执行拷贝：

```bash
docker run --rm -v <旧卷名>:/old alpine ls -la /old
# 若有子目录（如 covers）
docker run --rm -v <旧卷名>:/old alpine ls -laR /old
```

若本机没有 `alpine` 且无法拉取，可先用已有镜像（见第四节）。

---

## 四、从旧卷拷贝到新目录

思路：用**临时容器**同时挂载旧卷和当前宿主机目录，在容器内执行 `cp`，把旧卷内容拷贝到绑定挂载目录。

### 4.1 使用 Alpine 镜像（推荐，需能拉取镜像）

在项目根目录执行（将 `<旧卷名>` 换为实际卷名，如 `kenanyah-blog_uploads_data`）：

```bash
docker run --rm \
  -v <旧卷名>:/old \
  -v "$(pwd)/apps/api/uploads:/new" \
  alpine sh -c "cp -av /old/. /new/"
```

- `-v <旧卷名>:/old`：把命名卷挂到容器内 `/old`。
- `-v "$(pwd)/apps/api/uploads:/new"`：把当前项目下的 `apps/api/uploads` 挂到容器内 `/new`。
- `cp -av /old/. /new/`：递归拷贝并保留权限、时间戳；`/old/.` 表示卷内全部内容（含隐藏文件）。

若提示 `Unable to find image 'alpine:latest' locally`，Docker 会尝试拉取。若网络受限无法拉取，见下节。

### 4.2 无法拉取 Alpine 时的替代方案

使用**本机已有**的任意带 shell 的镜像（如 Node、或当前运行的 API 镜像）执行同样逻辑。

**方式 A：使用 Node 镜像**

```bash
docker run --rm \
  -v <旧卷名>:/old \
  -v "$(pwd)/apps/api/uploads:/new" \
  node:alpine sh -c "cp -av /old/. /new/"
```

**方式 B：使用当前项目的 API 镜像**

先查 API 镜像 ID 或名称（在 compose 所在目录）：

```bash
docker compose -f docker-compose.prod.yml images -q api
# 或
docker images | grep -E 'api|blog'
```

再用该镜像运行拷贝（将 `<API 镜像名或 ID>` 替换为上面输出）：

```bash
docker run --rm \
  -v <旧卷名>:/old \
  -v "$(pwd)/apps/api/uploads:/new" \
  <API 镜像名或 ID> \
  sh -c "cp -av /old/. /new/"
```

拷贝完成后，`./apps/api/uploads` 中应出现与旧卷相同的目录结构（如 `covers/` 等）及文件。

---

## 五、验证与生效

### 5.1 在宿主机检查文件

```bash
ls -la apps/api/uploads
ls -la apps/api/uploads/covers   # 若有 covers 子目录
```

确认图片等文件已存在。

### 5.2 重启 API 服务（若未自动挂载）

若 compose 已使用绑定挂载且服务在运行，新文件一般会立即可见；若有缓存或需确保挂载生效，可重启 API：

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod restart api
# 若使用 pull 方式部署
docker compose -f docker-compose.prod.pull.yml --env-file .env.prod restart api
```

### 5.3 访问校验

在浏览器或通过 curl 访问此前已知的上传资源 URL，例如：

```text
https://www.xyan.store/uploads/covers/xxx.png
```

应能正常返回图片。

---

## 六、迁移后可选操作

### 6.1 保留旧卷一段时间

建议迁移验证无误并运行一段时间后再考虑删除旧卷，避免误删唯一副本：

```bash
# 确认不再需要后再执行
docker volume rm <旧卷名>
```

### 6.2 备份新目录（推荐）

绑定挂载后，可直接对宿主机目录做定期备份，例如：

```bash
tar -czvf uploads-backup-$(date +%Y%m%d).tar.gz apps/api/uploads
# 或使用 rsync 同步到备份机
rsync -avz apps/api/uploads/ user@backup-server:/backup/blog/uploads/
```

---

## 七、步骤速查表

| 步骤 | 命令/操作 |
|------|-----------|
| 1. 进入项目根目录 | `cd /path/to/blog` |
| 2. 列出旧卷 | `docker volume ls \| grep -E 'upload\|blog'` |
| 3. 创建目标目录 | `mkdir -p apps/api/uploads` |
| 4. 从旧卷拷贝到绑定目录 | `docker run --rm -v <旧卷名>:/old -v "$(pwd)/apps/api/uploads:/new" alpine sh -c "cp -av /old/. /new/"` |
| 5. 验证文件 | `ls -la apps/api/uploads` |
| 6. 重启 API（如需） | `docker compose -f docker-compose.prod.yml --env-file .env.prod restart api` |
| 7. 访问测试 | 打开已知的 `/uploads/...` URL |

---

## 八、常见问题

**Q：拷贝时出现 “Permission denied” 或权限异常？**  
A：可用 `cp -a` 保留权限；若目标目录属主与容器内用户不一致，可在拷贝后执行 `chown -R <运行 API 的用户> apps/api/uploads`（具体用户视 API 容器内 UID 而定）。

**Q：旧卷已经删除了怎么办？**  
A：命名卷删除后数据无法通过 Docker 恢复。只能从其他备份（如本机 tar、另一台机器的 rsync 副本）恢复，或重新上传资源。

**Q：能否不拷贝，继续用命名卷？**  
A：可以。在 compose 中保留命名卷配置（并声明顶层 volume），不改为绑定挂载即可。迁移到绑定挂载的目的是便于在宿主机直接管理、备份 uploads。

---

本文对应场景：**修改了 API 的 uploads 挂载方式（从命名卷改为绑定挂载）后，将原命名卷中的上传资源迁移到新的宿主机目录**。按上述步骤操作即可在不停服或短暂重启后恢复原有资源访问。
