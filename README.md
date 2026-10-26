# 图提取 ImageGrab - 电商图片下载助手

一键提取淘宝、天猫、京东、拼多多前台商品详情页的主图、SKU 图与详情图，勾选后批量下载为 PNG。

## 安装步骤

1. 打开 Chrome，地址栏输入 `chrome://extensions` 回车
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本文件夹
4. 打开任意淘宝 / 天猫 / 京东 / 拼多多**商品详情页**，右下角会出现「获取图片」按钮

## 使用方法

1. 在商品详情页点击右下角「获取图片」（会短暂滚动页面以加载懒加载图片）
2. 自动提取后打开预览页，网格展示图片
3. 勾选要下载的图片（支持全选 / 反选）
4. 点击「下载选中」，由插件后台转成 PNG 再保存
5. 若 Chrome 询问「是否允许下载多个文件」，请点允许

转码失败时会按原格式（jpg / webp 等）保存，不会用假的 `.png` 后缀。

## 项目结构

```
image-grab/
├── manifest.json
├── content.js              # 详情页按钮、懒加载滚动、iframe 协作
├── content.css
├── background.js           # 打开预览页、跨域拉图、转 PNG、下载
├── gallery.html
├── gallery.js
├── gallery.css
├── icons/
├── extractors/
│   ├── url.js              # 原图还原、过滤、去重
│   ├── taobao.js
│   ├── jd.js
│   └── pdd.js
└── docs/                   # 宣传页
```
