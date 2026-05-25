# 安装

## Homebrew（macOS 和 Linux）

```bash
brew tap samueltuyizere/tap
brew install oc-go-cc
```

## Scoop（Windows）

```powershell
scoop bucket add oc-go-cc https://github.com/samueltuyizere/scoop-bucket
scoop install oc-go-cc
```

## 源码编译

```bash
git clone https://github.com/samueltuyizere/oc-go-cc.git
cd oc-go-cc
make build

# 二进制文件在 bin/oc-go-cc
# 可选安装到 $GOPATH/bin
make install
```

## 下载发布版

从 [Releases 页面](https://github.com/samueltuyizere/oc-go-cc/releases) 下载适用于你平台的最新版本：

| 平台                    | 文件                           |
| ----------------------- | ------------------------------ |
| macOS（Apple Silicon）  | `oc-go-cc_darwin-arm64`        |
| macOS（Intel）          | `oc-go-cc_darwin-amd64`        |
| Linux（x86_64）         | `oc-go-cc_linux-amd64`         |
| Linux（ARM64）          | `oc-go-cc_linux-arm64`         |
| Windows（x86_64）       | `oc-go-cc_windows-amd64.exe`   |
| Windows（ARM64）        | `oc-go-cc_windows-arm64.exe`   |

```bash
# macOS Apple Silicon
curl -L -o oc-go-cc https://github.com/samueltuyizere/oc-go-cc/releases/latest/download/oc-go-cc_darwin-arm64
chmod +x oc-go-cc
sudo mv oc-go-cc /usr/local/bin/

# Windows（PowerShell）
Invoke-WebRequest -Uri "https://github.com/samueltuyizere/oc-go-cc/releases/latest/download/oc-go-cc_windows-amd64.exe" -OutFile "oc-go-cc.exe"
Move-Item -Path "oc-go-cc.exe" -Destination "$env:LOCALAPPDATA\Microsoft\WindowsApps\oc-go-cc.exe"
```

## 系统要求

- 一个 [OpenCode Go](https://opencode.ai/auth) 订阅和 API 密钥
- Go 1.21+（仅源码编译时需要）
