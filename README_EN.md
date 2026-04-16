<div align="center">

[![English Doc](https://img.shields.io/badge/Doc-English-blue)](README_EN.md)
[![中文文档](https://img.shields.io/badge/文档-中文-blue)](README.md)

</div>

---

# 5572TV

<div align="center">
  <img src="public/logo.svg" alt="5572TV Logo" width="220">
</div>

> 🎬 **5572TV** is an independently maintained streaming platform built for real production use. The live site is `www.5572.net`, with a strong focus on Cloudflare-assisted acceleration, low-resource server compatibility, cache governance, operational stability, and a polished watching experience, alongside features such as **YouTube Integration**, **Cloud Drive Search**, **AI Recommendations**, **Short Drama**, **IPTV Live TV**, **Bangumi Anime**, **Watch Statistics**, and **Danmaku**.

> ⚠️ **License and Usage Notice**
>
> - This source code is provided for **learning, research, and non-commercial use only**.
> - **Commercial use is prohibited**, including but not limited to paid deployment, commercial hosting, selling the source code, selling modified versions, traffic monetization, or bundling with commercial products/services.
> - The project may interact with third-party video APIs, metadata, images, trailers, or other external resources; **all copyright, compliance, and usage responsibilities for such resources are solely the responsibility of the actual user/operator**.
> - The project authors **do not grant any license to third-party media content**, and provide no warranty regarding the legality, availability, or continued accessibility of third-party resources.

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.1.0-000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19.0.0-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1.18-38bdf8?logo=tailwindcss)
![ArtPlayer](https://img.shields.io/badge/ArtPlayer-5.4.0-ff6b6b)
![HLS.js](https://img.shields.io/badge/HLS.js-1.6.15-ec407a)
![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-orange)
![Docker Ready](https://img.shields.io/badge/Docker-ready-blue?logo=docker)
![Version](https://img.shields.io/badge/Version-1.0.0-orange)

</div>

---

## 📢 About

This repository is maintained for the live operation of `www.5572.net` and its ongoing iteration. The current focus is Cloudflare-assisted delivery, low-resource server deployment, caching strategy, interface stability, playback experience, and deployment reliability. See [CHANGELOG](CHANGELOG) for all new features.

### Current Release Status

- Current independent version: `v1.0.0`
- Release position: the first formal standalone release of `5572tv / 5572TV`
- Highlights of this release: standalone repository transition, non-commercial usage notice, deployment pipeline migration, full auth-flow verification, invalid play-source handling, and cache / Cloudflare acceleration improvements

### Repository Positioning

- Active maintained repository: `tdy0923/5572tv`
- Repository role: the independent production branch of the project
- Maintenance focus: low-resource server deployment, Cloudflare integration, interface stability, caching, and performance governance

## ⚠️ Disclaimer

This project is for educational purposes only. Do not use for commercial purposes. All video content comes from third-party platforms. This project does not store any video files. Users are solely responsible for any legal consequences arising from the use of this project.

## 💡 Key Enhancements

### 🎥 Content Ecosystem

- **Emby Private Library**: Complete Emby media server integration with passwordless login, auth mode switcher, and multi-audio track playback → [Documentation](docs/integration/EMBY_GUIDE.md)
- **YouTube Integration**: Full YouTube search, playback, and live streaming
- **Cloud Drive Search**: Advanced filtering and cache management
- **ACG Torrent Search**: Mikan Project dual-source system
- **IPTV Live TV**: m3u/m3u8 subscription, FLV streaming, EPG guide
- **Bangumi Anime**: Intelligent anime detection and API integration
- **Traditional Chinese Search**: Smart conversion and multi-strategy search
- **Search List View**: Grid/list dual view mode with image preview and quick play button

### 🎬 Player Enhancements

- **Ultrawide Monitor Support**: Video display mode control for ultrawide monitors
- **Skip Presets**: Flexible intro/outro template system with import/export and validation
- **Persistent Playback Rate**: Remember playback speed settings across sessions
- **Multi-Audio Track Support**: Auto-select browser-compatible audio tracks for Emby playback with track switching

### 🔔 Content Tracking System

- **Upcoming Content Reminders**: Complete watchlist and reminder system for upcoming content
- **Auto Release Notifications**: Automatic push notifications when favorited content is released
- **Invite Code System**: Registration system with invite codes, history tracking, and management

### 🤖 AI Recommendation System

- **AI Assistant**: GPT-5/o series models support, streaming → [Documentation](docs/features/AI_FEATURES.md)
- **Tavily Search Mode**: Search mode without AI API
- **TMDB Actor Search**: Complete actor search, filtering, and caching
- **Release Calendar**: Preview and track upcoming content

### 💬 Danmaku Ecosystem

- **Third-party Danmaku API**: Integration with Tencent, iQiyi, Youku, Bilibili
- **Smart Performance**: Tiered rendering, Web Worker acceleration
- **Manual Danmaku Matching**: Precise danmaku retrieval
- **Comprehensive Settings**: Complete danmaku configuration panel

### 📊 Performance & Monitoring

- **Performance Dashboard**: Complete API performance monitoring
- **Traffic Monitoring**: Real traffic monitoring and domain analysis
- **Kvrocks Persistence**: High-performance caching system

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
# Clone the project
git clone https://github.com/tdy0923/5572tv.git
cd 5572tv

# Copy environment variables
cp .env.example .env

# Edit .env file and configure necessary environment variables
nano .env

# Start services
docker-compose up -d
```

Visit `http://localhost:3000` to use.

### Local Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

**Detailed Deployment Guide**: [View Full Documentation](docs/deployment/DEPLOYMENT.md)

## 📚 Documentation

### Core Documentation

- 📖 [Documentation Center](docs/README.md) - Navigation page for all docs
- 🚀 [Deployment Guide](docs/deployment/DEPLOYMENT.md) - Docker, Vercel deployment
- ⚙️ [Configuration](docs/deployment/CONFIGURATION.md) - Environment variables and settings
- 📱 [Mobile Guide](docs/mobile/MOBILE.md) - Mobile APP and AndroidTV usage

### Feature Documentation

- 🤖 [AI Features](docs/features/AI_FEATURES.md)
- 📥 [Download Features](docs/features/DOWNLOAD_FEATURES.md)
- 📺 [Virtual Scroll Guide](docs/features/VIRTUAL_SCROLL_GUIDE.md)

### Integration Guides

- 🎬 [Emby Integration](docs/integration/EMBY_GUIDE.md)
- 📺 [TVBox Integration](docs/integration/TVBOX.md)
- 🔒 [TVBox Security](docs/integration/TVBOX_SECURITY.md)

### Authentication

- 🔐 [OIDC Setup](docs/authentication/OIDC_SETUP.md)
- 💬 [Telegram Auth](docs/authentication/TELEGRAM_AUTH.md)
- 🌐 [Trusted Network](docs/authentication/TRUSTED_NETWORK.md)

### Advanced Configuration

- 🔧 [Proxy Config](docs/advanced/PROXY_CONFIG.md)
- 🚫 [Ad Filter](docs/advanced/CUSTOM_AD_FILTER.md)
- ⏭️ [Skip Controller](docs/advanced/SKIP_CONTROLLER_GUIDE.md)

## 🔧 Tech Stack

- **Frontend**: Next.js 16.1.0 + React 19.0.0
- **Language**: TypeScript 5.8.3
- **Styling**: TailwindCSS 4.1.18
- **Video Player**: ArtPlayer 5.4.0 + HLS.js 1.6.15
- **State Management**: TanStack Query 5.91.0
- **Database**: Upstash Redis + Kvrocks
- **Deployment**: Docker / Vercel / Render

## 📜 Changelog

See [CHANGELOG](CHANGELOG) for all version updates.

## 🔐 Security & Privacy

For detailed security configuration and privacy protection, see [Security Documentation](docs/security/SECURITY.md).

## 📄 License

[![CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

**This means**:

- ✅ You are free to share, copy, and modify this project
- ✅ You must give appropriate credit and provide a link to the license
- ❌ You may not use this project for commercial purposes
- ⚠️ If you remix, transform, or build upon the material, you must distribute your contributions under the same license

© 2025-2026 5572TV & Contributors

This project is now maintained as an independent repository.

## 🙏 Acknowledgments

### Acknowledgments

- [MoonTV](https://github.com/MoonTechLab/LunaTV) — one of the early architectural and product inspirations; thanks to the original author and contributors
- [Selene](https://github.com/MoonTechLab/Selene) — reference for the official mobile app ecosystem and interaction ideas
- [LibreTV](https://github.com/LibreSpark/LibreTV) — inspiration for some product ideas and user experience directions

### Core Dependencies

- [Next.js](https://nextjs.org/) — React framework
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) — Powerful web video player
- [HLS.js](https://github.com/video-dev/hls.js) — HLS streaming support
- [TanStack Virtual](https://github.com/TanStack/virtual) — Virtual scrolling component
- [Tailwind CSS](https://tailwindcss.com/) — CSS framework

### Data Sources & Services

- [Douban](https://movie.douban.com/) — Movie information data
- [TMDB](https://www.themoviedb.org/) — Movie database
- [Bangumi](https://bangumi.tv/) — Anime information

### Design & Implementation References

This project also references design ideas and implementation details from these excellent open-source projects:

- **[MoonTVPlus](https://github.com/mtvpls/MoonTVPlus)** — watch room sync playback and mobile optimization
- **[DecoTV](https://github.com/Decohererk/DecoTV)** — TVBox security strategy, performance optimization, and UI design
- **[watch-room-server](https://github.com/tgs9915/watch-room-server)** — external watch-room Socket service support and deployment reference
- **[CORSAPI](https://github.com/SzeMeng76/CORSAPI)** — CORS and proxy deployment ideas used in TVBox-related scenarios

Thanks to these projects and authors for the open-source inspiration and practical ideas.

### Special Thanks

- All sites providing free video APIs
- Open-source community contributors
- Users who provide feedback

---

## 📊 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=tdy0923/5572tv&type=Date)](https://www.star-history.com/#tdy0923/5572tv&Date)

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

Made with ❤️ by 5572TV Team

</div>
